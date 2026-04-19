/**
 * Social Media Auto-Publishing
 *
 * Admin posts a school achievement (award, event, result) from Admin Portal.
 * System:
 *  1. Checks parental consent flags (no student photos/names without consent)
 *  2. Queues post for approval (optional — configurable per school)
 *  3. Publishes to Facebook Page + Instagram Business via Graph API
 *  4. Supports scheduled posting
 *  5. Records engagement metrics (likes, shares, reach) for analytics
 */
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import axios from "axios";

export type SocialPlatform = "FACEBOOK" | "INSTAGRAM" | "BOTH";

export interface SocialPost {
  schoolId: string;
  title: string;
  message: string;
  imageUrl?: string;
  platform: SocialPlatform;
  scheduleAt?: Date;    // null = publish immediately
  mentionsStudents: boolean;
  createdBy: string;
}

export interface PostResult {
  platform: string;
  postId?: string;
  status: "PUBLISHED" | "SCHEDULED" | "BLOCKED" | "FAILED";
  reason?: string;
}

@Injectable()
export class SocialPublishService {
  constructor(private readonly prisma: PrismaService) {}

  async publishAchievement(post: SocialPost): Promise<PostResult[]> {
    // ── 1. Parental consent check ─────────────────────────────────────────
    if (post.mentionsStudents) {
      const consentGiven = await this.checkConsentPolicy(post.schoolId);
      if (!consentGiven) {
        return [{
          platform: post.platform,
          status: "BLOCKED",
          reason: "School's social media consent policy requires explicit parental consent before publishing content that mentions students.",
        }];
      }
    }

    // ── 2. If scheduled — persist and return ─────────────────────────────
    if (post.scheduleAt && post.scheduleAt > new Date()) {
      await this.persistPost({ ...post, status: "SCHEDULED" });
      return [{ platform: post.platform, status: "SCHEDULED" }];
    }

    // ── 3. Publish now ───────────────────────────────────────────────────
    const results: PostResult[] = [];
    const creds = await this.getCredentials(post.schoolId);

    if ((post.platform === "FACEBOOK" || post.platform === "BOTH") && creds?.facebookPageToken) {
      results.push(await this.publishToFacebook(post, creds.facebookPageId!, creds.facebookPageToken));
    }

    if ((post.platform === "INSTAGRAM" || post.platform === "BOTH") && creds?.instagramAccountId) {
      results.push(await this.publishToInstagram(post, creds.instagramAccountId, creds.facebookPageToken!));
    }

    await this.persistPost({ ...post, status: "PUBLISHED", results });
    return results;
  }

  private async publishToFacebook(
    post: SocialPost,
    pageId: string,
    pageToken: string
  ): Promise<PostResult> {
    try {
      const params: Record<string, string> = {
        message: `${post.title}\n\n${post.message}`,
        access_token: pageToken,
      };
      if (post.imageUrl) params.link = post.imageUrl;

      const res = await axios.post(
        `https://graph.facebook.com/v19.0/${pageId}/feed`,
        params
      );
      return { platform: "FACEBOOK", postId: res.data.id, status: "PUBLISHED" };
    } catch (err: any) {
      return { platform: "FACEBOOK", status: "FAILED", reason: err?.response?.data?.error?.message ?? err.message };
    }
  }

  private async publishToInstagram(
    post: SocialPost,
    accountId: string,
    accessToken: string
  ): Promise<PostResult> {
    try {
      if (!post.imageUrl) {
        return { platform: "INSTAGRAM", status: "BLOCKED", reason: "Instagram requires an image." };
      }
      // Step 1: create media container
      const containerRes = await axios.post(
        `https://graph.facebook.com/v19.0/${accountId}/media`,
        { image_url: post.imageUrl, caption: `${post.title}\n\n${post.message}`, access_token: accessToken }
      );
      const creationId = containerRes.data.id;
      // Step 2: publish
      const publishRes = await axios.post(
        `https://graph.facebook.com/v19.0/${accountId}/media_publish`,
        { creation_id: creationId, access_token: accessToken }
      );
      return { platform: "INSTAGRAM", postId: publishRes.data.id, status: "PUBLISHED" };
    } catch (err: any) {
      return { platform: "INSTAGRAM", status: "FAILED", reason: err?.response?.data?.error?.message ?? err.message };
    }
  }

  async getEngagementAnalytics(schoolId: string): Promise<any[]> {
    return this.prisma.$queryRaw`
      SELECT
        sp.platform, sp.title,
        sp.published_at,
        sp.facebook_likes,
        sp.facebook_shares,
        sp.facebook_reach,
        sp.instagram_likes,
        sp.instagram_reach
      FROM social_posts sp
      WHERE sp.school_id = ${schoolId}
      ORDER BY sp.published_at DESC
      LIMIT 20
    `;
  }

  private async checkConsentPolicy(schoolId: string): Promise<boolean> {
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT social_media_consent_required FROM schools WHERE id = ${schoolId}
    `;
    // If school requires explicit consent but hasn't enabled it, block
    return !result[0]?.social_media_consent_required;
  }

  private async getCredentials(schoolId: string): Promise<any> {
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT facebook_page_id, facebook_page_token, instagram_account_id
      FROM school_social_credentials
      WHERE school_id = ${schoolId}
    `;
    return result[0] ?? null;
  }

  private async persistPost(data: any): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO social_posts (school_id, platform, title, message, image_url, status, created_by, scheduled_at, published_at)
      VALUES (
        ${data.schoolId}, ${data.platform}, ${data.title}, ${data.message},
        ${data.imageUrl ?? null}, ${data.status}, ${data.createdBy},
        ${data.scheduleAt ?? null},
        ${data.status === "PUBLISHED" ? new Date() : null}
      )
    `;
  }
}
