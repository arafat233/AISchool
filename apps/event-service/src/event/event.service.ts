import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError, ConflictError } from "@school-erp/errors";
import { randomUUID } from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// House points config
const POINTS_BY_POSITION: Record<number, number> = { 1: 10, 2: 7, 3: 5, 4: 3 };

@Injectable()
export class EventService {
  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // [1/10] Event CRUD — Sports Day, Annual Day, Field Trip, PTM, Workshop, Competition (with budget)
  // ═══════════════════════════════════════════════════════════════════════════

  async createEvent(schoolId: string, createdBy: string, data: {
    title: string; type: string; startDate: Date; endDate: Date;
    description?: string; venue?: string; budgetRs?: number;
  }) {
    return this.prisma.schoolEvent.create({
      data: { schoolId, createdBy, ...data, budgetRs: data.budgetRs ? data.budgetRs : undefined },
    });
  }

  async updateEvent(eventId: string, data: Partial<{ title: string; type: string; startDate: Date; endDate: Date; description: string; venue: string; budgetRs: number; status: string }>) {
    return this.prisma.schoolEvent.update({ where: { id: eventId }, data });
  }

  async getEvents(schoolId: string, type?: string, status?: string, from?: Date, to?: Date) {
    return this.prisma.schoolEvent.findMany({
      where: {
        schoolId,
        ...(type ? { type } : {}),
        ...(status ? { status } : {}),
        ...(from || to ? { startDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      },
      orderBy: { startDate: "asc" },
      include: { _count: { select: { participants: true } } },
    });
  }

  async getEventById(eventId: string) {
    const ev = await this.prisma.schoolEvent.findUnique({
      where: { id: eventId },
      include: {
        participants: true,
        sportsDayConfig: { include: { tracks: { include: { heats: { include: { entries: true } }, medals: true } } } },
        dramaConfig: { include: { auditions: true, castings: true, rehearsals: true, props: true, tickets: true } },
        competitionConfig: { include: { participants: true, judges: true, rounds: { include: { scores: true } } } },
        photoGallery: true,
      },
    });
    if (!ev) throw new NotFoundError("Event not found");
    return ev;
  }

  async deleteEvent(eventId: string) {
    return this.prisma.schoolEvent.update({ where: { id: eventId }, data: { status: "CANCELLED" } });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [2/10] Participant registration — students + staff + parents, consent form for trips
  // ═══════════════════════════════════════════════════════════════════════════

  async registerParticipant(eventId: string, data: {
    memberId: string; memberRole: string; consentGiven?: boolean; consentDocUrl?: string;
  }) {
    const ev = await this.prisma.schoolEvent.findUnique({ where: { id: eventId } });
    if (!ev) throw new NotFoundError("Event not found");

    // FIELD_TRIP requires consent doc
    if (ev.type === "FIELD_TRIP" && !data.consentDocUrl) {
      throw new ConflictError("Field trip registration requires consent document upload");
    }

    const qrCode = `EVENT-${eventId}-${data.memberId}-${randomUUID().slice(0, 8).toUpperCase()}`;
    return this.prisma.eventParticipant.upsert({
      where: { eventId_memberId: { eventId, memberId: data.memberId } },
      create: { eventId, ...data, qrCode },
      update: { consentGiven: data.consentGiven, consentDocUrl: data.consentDocUrl },
    });
  }

  async checkInParticipant(eventId: string, memberId: string) {
    const p = await this.prisma.eventParticipant.findUnique({
      where: { eventId_memberId: { eventId, memberId } },
    });
    if (!p) throw new NotFoundError("Participant not registered for this event");

    return this.prisma.eventParticipant.update({
      where: { eventId_memberId: { eventId, memberId } },
      data: { checkedIn: true, checkedInAt: new Date() },
    });
  }

  async getParticipants(eventId: string, memberRole?: string) {
    return this.prisma.eventParticipant.findMany({
      where: { eventId, ...(memberRole ? { memberRole } : {}) },
      orderBy: { createdAt: "asc" },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [3/10] Sports Day management — track & field, heats/brackets, house points, medal tally, champion
  // ═══════════════════════════════════════════════════════════════════════════

  async initSportsDay(eventId: string) {
    const ev = await this.prisma.schoolEvent.findUnique({ where: { id: eventId } });
    if (!ev) throw new NotFoundError("Event not found");

    return this.prisma.sportsDayConfig.upsert({
      where: { eventId },
      create: { eventId },
      update: {},
    });
  }

  async addSportsDayTrack(configId: string, data: { name: string; category: string; ageGroup?: string; gender?: string }) {
    return this.prisma.sportsDayTrack.create({ data: { configId, ...data } });
  }

  async createHeat(trackId: string, round: string, heatNo: number) {
    return this.prisma.sportsHeat.create({ data: { trackId, round, heatNo } });
  }

  async addSportsEntry(heatId: string, data: { studentId: string; houseId?: string }) {
    return this.prisma.sportsEntry.create({ data: { heatId, ...data } });
  }

  async recordSportsResult(heatId: string, results: Array<{ studentId: string; timing: string; position: number }>) {
    // Position → points mapping
    const ops = results.map((r) =>
      this.prisma.sportsEntry.updateMany({
        where: { heatId, studentId: r.studentId },
        data: { timing: r.timing, position: r.position, points: POINTS_BY_POSITION[r.position] ?? 0 },
      })
    );
    await this.prisma.$transaction(ops);

    // Mark heat complete
    await this.prisma.sportsHeat.update({ where: { id: heatId }, data: { status: "COMPLETE" } });

    // Auto-award medals for FINAL rounds
    const heat = await this.prisma.sportsHeat.findUnique({ where: { id: heatId }, include: { track: true } });
    if (heat?.round === "FINAL") {
      const medalMap: Record<number, string> = { 1: "GOLD", 2: "SILVER", 3: "BRONZE" };
      const entries = await this.prisma.sportsEntry.findMany({
        where: { heatId, position: { lte: 3 } },
        include: { heat: { include: { track: true } } },
      });
      await this.prisma.$transaction(
        entries.map((e) =>
          this.prisma.sportsMedal.create({
            data: { trackId: e.heatId, studentId: e.studentId, medal: medalMap[e.position!] ?? "BRONZE", houseId: e.houseId ?? undefined },
          })
        )
      );
    }
  }

  async awardHousePoints(houseId: string, configId: string | undefined, category: string, points: number, awardedBy: string, reason?: string) {
    return this.prisma.housePoints.create({
      data: { houseId, configId, category, points, awardedBy, reason },
    });
  }

  async getHouseLeaderboard(schoolId: string) {
    const houses = await this.prisma.house.findMany({
      where: { schoolId },
      include: { housePoints: true },
    });

    const tally = houses.map((h) => ({
      houseId: h.id, name: h.name, colour: h.colour,
      totalPoints: h.housePoints.reduce((s, p) => s + p.points, 0),
      byCategory: h.housePoints.reduce<Record<string, number>>((acc, p) => {
        acc[p.category] = (acc[p.category] ?? 0) + p.points;
        return acc;
      }, {}),
    }));

    return tally.sort((a, b) => b.totalPoints - a.totalPoints);
  }

  async declareChampionHouse(configId: string) {
    const config = await this.prisma.sportsDayConfig.findUnique({
      where: { id: configId },
      include: { housePoints: true },
    });
    if (!config) throw new NotFoundError("Sports Day config not found");

    const tally: Record<string, number> = {};
    for (const p of config.housePoints) tally[p.houseId] = (tally[p.houseId] ?? 0) + p.points;
    const championId = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!championId) throw new ConflictError("No house points recorded yet");

    return this.prisma.sportsDayConfig.update({ where: { id: configId }, data: { championHouseId: championId } });
  }

  async getMedalTally(configId: string) {
    // Get all events for this sports day config, then aggregate medals
    const config = await this.prisma.sportsDayConfig.findUnique({
      where: { id: configId },
      include: { tracks: { include: { medals: true } } },
    });
    if (!config) throw new NotFoundError("Sports Day config not found");

    const tally: Record<string, { gold: number; silver: number; bronze: number; total: number }> = {};
    for (const track of config.tracks) {
      for (const m of track.medals) {
        const key = m.houseId ?? m.studentId;
        if (!tally[key]) tally[key] = { gold: 0, silver: 0, bronze: 0, total: 0 };
        if (m.medal === "GOLD") tally[key].gold++;
        else if (m.medal === "SILVER") tally[key].silver++;
        else tally[key].bronze++;
        tally[key].total++;
      }
    }
    return Object.entries(tally)
      .map(([id, t]) => ({ id, ...t }))
      .sort((a, b) => b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [4/10] Drama / Production management
  // ═══════════════════════════════════════════════════════════════════════════

  async initDramaProduction(eventId: string, productionTitle: string, totalSeats?: number) {
    return this.prisma.dramaProductionConfig.upsert({
      where: { eventId },
      create: { eventId, productionTitle, totalSeats },
      update: { productionTitle, totalSeats },
    });
  }

  async scheduleAudition(configId: string, data: { studentId: string; role: string; scheduledAt: Date; notes?: string }) {
    return this.prisma.dramaAudition.create({ data: { configId, ...data } });
  }

  async recordAuditionResult(auditionId: string, result: "SELECTED" | "WAITLISTED" | "REJECTED", notes?: string) {
    const audition = await this.prisma.dramaAudition.update({
      where: { id: auditionId },
      data: { result, notes },
    });
    // Auto-create casting record if selected
    if (result === "SELECTED") {
      await this.prisma.dramaCasting.upsert({
        where: { configId_studentId_role: { configId: audition.configId, studentId: audition.studentId, role: audition.role } },
        create: { configId: audition.configId, studentId: audition.studentId, role: audition.role },
        update: {},
      });
    }
    return audition;
  }

  async scheduleRehearsal(configId: string, data: { scheduledAt: Date; venue?: string; attendees: string[]; notes?: string }) {
    return this.prisma.dramaRehearsal.create({ data: { configId, ...data } });
  }

  async manageDramaProp(configId: string, data: { name: string; category: string; quantity?: number; assignedTo?: string }) {
    return this.prisma.dramaProp.create({ data: { configId, ...data, quantity: data.quantity ?? 1 } });
  }

  async updateDramaProp(propId: string, data: Partial<{ quantity: number; assignedTo: string; status: string }>) {
    return this.prisma.dramaProp.update({ where: { id: propId }, data });
  }

  async bookDramaTicket(configId: string, bookedBy: string, seatNo?: string, priceRs?: number) {
    const config = await this.prisma.dramaProductionConfig.findUnique({
      where: { id: configId },
      include: { _count: { select: { tickets: true } } },
    });
    if (!config) throw new NotFoundError("Drama production not found");
    if (config.totalSeats && (config as any)._count.tickets >= config.totalSeats) {
      throw new ConflictError("No seats available");
    }

    const qrCode = `DRAMA-${configId}-${bookedBy}-${randomUUID().slice(0, 8).toUpperCase()}`;
    return this.prisma.dramaTicket.create({ data: { configId, bookedBy, seatNo, qrCode, priceRs } });
  }

  async checkInDramaTicket(qrCode: string) {
    const ticket = await this.prisma.dramaTicket.findUnique({ where: { qrCode } });
    if (!ticket) throw new NotFoundError("Ticket not found");
    if (ticket.checkedIn) throw new ConflictError("Ticket already used");

    return this.prisma.dramaTicket.update({ where: { qrCode }, data: { checkedIn: true, checkedInAt: new Date() } });
  }

  async getDramaConfig(configId: string) {
    return this.prisma.dramaProductionConfig.findUnique({
      where: { id: configId },
      include: { auditions: true, castings: true, rehearsals: true, props: true, tickets: true },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [5/10] Debate / Quiz / Academic Competition — brackets, judges, scoring, result declaration
  // ═══════════════════════════════════════════════════════════════════════════

  async initCompetition(eventId: string, data: { compType: string; isTeamBased?: boolean; teamSize?: number; scoringRubric?: object }) {
    return this.prisma.competitionConfig.upsert({
      where: { eventId },
      create: { eventId, ...data },
      update: data,
    });
  }

  async registerCompetitionParticipant(configId: string, data: { memberId: string; memberRole: string; teamName?: string; teamMembers?: string[] }) {
    return this.prisma.compParticipant.create({ data: { configId, ...data } });
  }

  async addJudge(configId: string, staffId: string, role?: string) {
    return this.prisma.compJudge.create({ data: { configId, staffId, role } });
  }

  async createCompRound(configId: string, roundName: string, roundNo: number, scheduledAt?: Date) {
    return this.prisma.compRound.create({ data: { configId, roundName, roundNo, scheduledAt } });
  }

  async submitScore(roundId: string, participantId: string, judgeId: string, score: number, notes?: string) {
    return this.prisma.compScore.create({ data: { roundId, participantId, judgeId, score, notes } });
  }

  async eliminateParticipant(participantId: string) {
    return this.prisma.compParticipant.update({ where: { id: participantId }, data: { isEliminated: true } });
  }

  async declareCompetitionResult(configId: string) {
    // Aggregate scores per participant across all rounds
    const rounds = await this.prisma.compRound.findMany({
      where: { configId },
      include: { scores: true },
    });

    const totals: Record<string, number> = {};
    for (const round of rounds) {
      for (const score of round.scores) {
        totals[score.participantId] = (totals[score.participantId] ?? 0) + Number(score.score);
      }
    }

    const ranked = Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .map(([participantId, total], i) => ({ rank: i + 1, participantId, totalScore: total }));

    await this.prisma.competitionConfig.update({ where: { id: configId } });
    await this.prisma.compRound.updateMany({ where: { configId }, data: { status: "COMPLETE" } });

    return { configId, results: ranked };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [6/10] Club management — enrollment, advisor, sessions, achievements
  // ═══════════════════════════════════════════════════════════════════════════

  async createClub(schoolId: string, data: { name: string; description?: string; advisorId: string; meetingSchedule?: string }) {
    return this.prisma.club.create({ data: { schoolId, ...data } });
  }

  async updateClub(clubId: string, data: Partial<{ name: string; description: string; advisorId: string; meetingSchedule: string; isActive: boolean }>) {
    return this.prisma.club.update({ where: { id: clubId }, data });
  }

  async getClubs(schoolId: string) {
    return this.prisma.club.findMany({
      where: { schoolId, isActive: true },
      include: { _count: { select: { memberships: true, sessions: true } } },
      orderBy: { name: "asc" },
    });
  }

  async applyForClub(clubId: string, studentId: string) {
    const club = await this.prisma.club.findUnique({ where: { id: clubId } });
    if (!club) throw new NotFoundError("Club not found");

    return this.prisma.clubMembership.upsert({
      where: { clubId_studentId: { clubId, studentId } },
      create: { clubId, studentId },
      update: {},
    });
  }

  async reviewClubApplication(membershipId: string, action: "APPROVED" | "REJECTED", approvedBy: string) {
    return this.prisma.clubMembership.update({
      where: { id: membershipId },
      data: { status: action, ...(action === "APPROVED" ? { approvedBy } : {}) },
    });
  }

  async recordClubSession(clubId: string, data: { sessionDate: Date; topic?: string; attendees: string[]; notes?: string }) {
    return this.prisma.clubSession.create({ data: { clubId, ...data } });
  }

  async addClubAchievement(membershipId: string, achievement: string) {
    const membership = await this.prisma.clubMembership.findUnique({ where: { id: membershipId } });
    if (!membership) throw new NotFoundError("Club membership not found");

    return this.prisma.clubMembership.update({
      where: { id: membershipId },
      data: { achievements: { push: achievement } },
    });
  }

  async getClubMembers(clubId: string, status?: string) {
    return this.prisma.clubMembership.findMany({
      where: { clubId, ...(status ? { status } : {}) },
      orderBy: { joinedAt: "asc" },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [7/10] NCC / NSS / Scouts & Guides — unit, members, ranks, camps, cert eligibility
  // ═══════════════════════════════════════════════════════════════════════════

  async createYouthUnit(schoolId: string, data: { orgType: string; unitName: string; officerId: string }) {
    return this.prisma.youthOrganizationUnit.upsert({
      where: { schoolId_orgType: { schoolId, orgType: data.orgType } },
      create: { schoolId, ...data },
      update: { unitName: data.unitName, officerId: data.officerId },
    });
  }

  async enrollYouthMember(unitId: string, studentId: string) {
    return this.prisma.youthOrgMember.upsert({
      where: { unitId_studentId: { unitId, studentId } },
      create: { unitId, studentId },
      update: {},
    });
  }

  async updateYouthMemberProgress(memberId: string, data: { rank?: string; hoursToAdd?: number; badgeLevel?: string }) {
    const member = await this.prisma.youthOrgMember.findUnique({ where: { id: memberId } });
    if (!member) throw new NotFoundError("Youth org member not found");

    const newHours = member.hoursLogged + (data.hoursToAdd ?? 0);

    // Cert eligibility: NSS = 240 hrs, NCC = any rank, Scouts = badge level
    const unit = await this.prisma.youthOrganizationUnit.findUnique({ where: { id: member.unitId } });
    let isEligible = member.isEligible;
    if (unit?.orgType === "NSS" && newHours >= 240) isEligible = true;
    if (unit?.orgType === "NCC" && data.rank) isEligible = true;
    if (unit?.orgType === "SCOUTS" && data.badgeLevel) isEligible = true;

    return this.prisma.youthOrgMember.update({
      where: { id: memberId },
      data: {
        ...(data.rank ? { rank: data.rank } : {}),
        ...(data.hoursToAdd ? { hoursLogged: newHours } : {}),
        ...(data.badgeLevel ? { badgeLevel: data.badgeLevel } : {}),
        isEligible,
      },
    });
  }

  async createYouthCamp(unitId: string, data: { campName: string; startDate: Date; endDate: Date; location?: string; participants: string[] }) {
    const camp = await this.prisma.youthCamp.create({ data: { unitId, ...data } });

    // Auto-log hours for NSS participants: camp days × 8 hrs
    const days = Math.ceil((data.endDate.getTime() - data.startDate.getTime()) / 86_400_000);
    const hours = days * 8;
    const unit = await this.prisma.youthOrganizationUnit.findUnique({ where: { id: unitId } });
    if (unit?.orgType === "NSS") {
      await Promise.all(
        data.participants.map((studentId) =>
          this.prisma.youthOrgMember.updateMany({
            where: { unitId, studentId },
            data: { hoursLogged: { increment: hours } },
          })
        )
      );
    }
    return camp;
  }

  async getYouthUnit(schoolId: string) {
    return this.prisma.youthOrganizationUnit.findMany({
      where: { schoolId, isActive: true },
      include: {
        _count: { select: { members: true, camps: true } },
        members: { where: { isEligible: true }, select: { studentId: true, rank: true, hoursLogged: true } },
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [8/10] Student Council / School Parliament — elections, voting, roles, minutes, budget
  // ═══════════════════════════════════════════════════════════════════════════

  async startElection(schoolId: string, academicYear: string) {
    return this.prisma.studentCouncilElection.upsert({
      where: { schoolId_academicYear: { schoolId, academicYear } },
      create: { schoolId, academicYear },
      update: { status: "NOMINATION" },
    });
  }

  async nominate(electionId: string, studentId: string, role: string) {
    const election = await this.prisma.studentCouncilElection.findUnique({ where: { id: electionId } });
    if (!election || election.status !== "NOMINATION") {
      throw new ConflictError("Nominations are not open");
    }
    return this.prisma.councilNomination.create({ data: { electionId, studentId, role } });
  }

  async openVoting(electionId: string) {
    return this.prisma.studentCouncilElection.update({
      where: { id: electionId }, data: { status: "VOTING" },
    });
  }

  async castVote(nominationId: string, voterId: string) {
    const nomination = await this.prisma.councilNomination.findUnique({
      where: { id: nominationId },
      include: { election: true },
    });
    if (!nomination) throw new NotFoundError("Nomination not found");
    if (nomination.election.status !== "VOTING") throw new ConflictError("Voting is not open");

    // One vote per voter per nomination (unique constraint)
    const vote = await this.prisma.councilVote.create({ data: { nominationId, voterId } });
    await this.prisma.councilNomination.update({
      where: { id: nominationId },
      data: { voteCount: { increment: 1 } },
    });
    return vote;
  }

  async declareElectionResults(electionId: string) {
    const nominations = await this.prisma.councilNomination.findMany({
      where: { electionId },
      orderBy: [{ role: "asc" }, { voteCount: "desc" }],
    });

    // Mark highest vote-getter per role as elected
    const seen = new Set<string>();
    const toElect: string[] = [];
    for (const n of nominations) {
      if (!seen.has(n.role)) {
        seen.add(n.role);
        toElect.push(n.id);
        await this.prisma.councilRole.upsert({
          where: { electionId_studentId_role: { electionId, studentId: n.studentId, role: n.role } },
          create: { electionId, studentId: n.studentId, role: n.role },
          update: { studentId: n.studentId },
        });
      }
    }

    await this.prisma.councilNomination.updateMany({
      where: { id: { in: toElect } },
      data: { isElected: true },
    });

    await this.prisma.studentCouncilElection.update({
      where: { id: electionId }, data: { status: "COMPLETE" },
    });

    return nominations;
  }

  async recordCouncilMeeting(electionId: string, data: {
    meetingDate: Date; agenda?: string; minutes?: string; proposals?: object[]; budgetUsedRs?: number;
  }) {
    return this.prisma.councilMeeting.create({
      data: { electionId, ...data, proposals: data.proposals ? data.proposals : undefined },
    });
  }

  async getElection(schoolId: string, academicYear: string) {
    return this.prisma.studentCouncilElection.findUnique({
      where: { schoolId_academicYear: { schoolId, academicYear } },
      include: { nominations: true, roles: true, minutes: { orderBy: { meetingDate: "desc" } } },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [9/10] House / Team system — CRUD, student assignment, points, leaderboard, inter-house
  // ═══════════════════════════════════════════════════════════════════════════

  async createHouse(schoolId: string, data: { name: string; colour?: string; motto?: string; houseMasterId?: string }) {
    return this.prisma.house.create({ data: { schoolId, ...data } });
  }

  async updateHouse(houseId: string, data: Partial<{ name: string; colour: string; motto: string; houseMasterId: string }>) {
    return this.prisma.house.update({ where: { id: houseId }, data });
  }

  async assignStudentToHouse(houseId: string, studentId: string, academicYear: string) {
    return this.prisma.houseMembership.upsert({
      where: { studentId_academicYear: { studentId, academicYear } },
      create: { houseId, studentId, academicYear },
      update: { houseId },
    });
  }

  async getHouseDetails(houseId: string) {
    return this.prisma.house.findUnique({
      where: { id: houseId },
      include: {
        memberships: true,
        housePoints: { orderBy: { awardedAt: "desc" }, take: 50 },
      },
    });
  }

  async getHouses(schoolId: string) {
    return this.prisma.house.findMany({ where: { schoolId }, orderBy: { name: "asc" } });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [10/10] Post-event photo gallery + achievement auto-linked to student portfolio
  // ═══════════════════════════════════════════════════════════════════════════

  async publishEventPhotos(eventId: string, photos: Array<{ url: string; caption?: string }>, uploadedBy: string) {
    const ev = await this.prisma.schoolEvent.findUnique({ where: { id: eventId } });
    if (!ev) throw new NotFoundError("Event not found");

    return this.prisma.$transaction(
      photos.map((p) => this.prisma.eventPhoto.create({ data: { eventId, url: p.url, caption: p.caption, uploadedBy } }))
    );
  }

  async getEventPhotos(eventId: string) {
    return this.prisma.eventPhoto.findMany({
      where: { eventId },
      orderBy: { createdAt: "asc" },
    });
  }

  async linkAchievementToPortfolio(studentId: string, data: {
    eventId: string; eventTitle: string; achievementType: string; description: string; awardedAt: Date;
  }) {
    return this.prisma.portfolioItem.create({
      data: {
        studentId,
        title: data.achievementType,
        description: `${data.eventTitle}: ${data.description}`,
        category: "Events",
        awardedAt: data.awardedAt,
        linkedEventId: data.eventId,
      },
    });
  }

  async getStudentEventAchievements(studentId: string) {
    return this.prisma.portfolioItem.findMany({
      where: { studentId, linkedEventId: { not: null } },
      orderBy: { awardedAt: "desc" },
    });
  }
}
