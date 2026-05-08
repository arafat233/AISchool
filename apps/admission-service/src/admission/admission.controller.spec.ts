import { Test, TestingModule } from "@nestjs/testing";
import { AdmissionController } from "./admission.controller";
import { AdmissionService } from "./admission.service";
import { AuthGuard } from "@nestjs/passport";
import { UserFactory } from "@school-erp/testing";

const mockUser = UserFactory.build({
  id: "user-1",
  schoolId: "sch-1",
  tenantId: "tenant-1",
  role: "ADMIN",
  email: "admin@school.com",
}) as any;

function makeReq(user = mockUser) {
  return { user } as any;
}

describe("AdmissionController", () => {
  let controller: AdmissionController;
  let service: jest.Mocked<AdmissionService>;

  beforeEach(async () => {
    const mockService: jest.Mocked<AdmissionService> = {
      createEnquiry: jest.fn(),
      getEnquiries: jest.fn(),
      getEnquiry: jest.fn(),
      updateEnquiry: jest.fn(),
      addFollowUp: jest.fn(),
      createApplication: jest.fn(),
      getApplications: jest.fn(),
      getApplication: jest.fn(),
      updateApplicationStatus: jest.fn(),
      uploadDocument: jest.fn(),
      verifyDocument: jest.fn(),
      ocrExtract: jest.fn(),
      confirmAdmission: jest.fn(),
      getRteQuota: jest.fn(),
      setRteQuota: jest.fn(),
      runRteLottery: jest.fn(),
      getFunnelReport: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdmissionController],
      providers: [{ provide: AdmissionService, useValue: mockService }],
    })
      .overrideGuard(AuthGuard("jwt"))
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdmissionController>(AdmissionController);
    service = module.get(AdmissionService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("health", () => {
    it("returns ok status", () => {
      expect(controller.health()).toEqual({ status: "ok", service: "admission-service" });
    });
  });

  describe("createEnquiry", () => {
    it("calls service.createEnquiry with schoolId from JWT and returns result", async () => {
      const dto = { studentName: "Rahul", parentName: "Mr Rahul", parentPhone: "9876543210" } as any;
      const result = { id: "enq-1", status: "OPEN" };
      service.createEnquiry.mockResolvedValueOnce(result as any);

      const res = await controller.createEnquiry(makeReq(), dto);
      expect(service.createEnquiry).toHaveBeenCalledWith("sch-1", expect.objectContaining({ studentName: "Rahul" }));
      expect(res).toBe(result);
    });
  });

  describe("getEnquiries", () => {
    it("calls service.getEnquiries with school, status, and source filters", async () => {
      service.getEnquiries.mockResolvedValueOnce([] as any);
      await controller.getEnquiries(makeReq(), "OPEN", "WALK_IN");
      expect(service.getEnquiries).toHaveBeenCalledWith("sch-1", "OPEN", "WALK_IN");
    });
  });

  describe("getEnquiry", () => {
    it("delegates to service.getEnquiry", async () => {
      service.getEnquiry.mockResolvedValueOnce({ id: "enq-1" } as any);
      const res = await controller.getEnquiry("enq-1");
      expect(service.getEnquiry).toHaveBeenCalledWith("enq-1");
      expect(res).toEqual({ id: "enq-1" });
    });
  });

  describe("updateEnquiry", () => {
    it("calls service.updateEnquiry with id and dto", async () => {
      const dto = { status: "CONVERTED" } as any;
      service.updateEnquiry.mockResolvedValueOnce({ id: "enq-1", status: "CONVERTED" } as any);
      const res = await controller.updateEnquiry("enq-1", dto);
      expect(service.updateEnquiry).toHaveBeenCalledWith("enq-1", expect.objectContaining({ status: "CONVERTED" }));
      expect(res).toBeDefined();
    });
  });

  describe("addFollowUp", () => {
    it("injects loggedBy from JWT user id", async () => {
      const dto = { channel: "PHONE", outcome: "Interested" } as any;
      service.addFollowUp.mockResolvedValueOnce({} as any);
      await controller.addFollowUp(makeReq(), "enq-1", dto);
      expect(service.addFollowUp).toHaveBeenCalledWith(
        "enq-1",
        expect.objectContaining({ loggedBy: "user-1" }),
      );
    });
  });

  describe("createApplication", () => {
    it("calls service.createApplication with schoolId from JWT", async () => {
      const dto = { studentName: "Priya", parentName: "Mrs Priya", parentPhone: "123", applyingForGrade: "Grade 1" } as any;
      service.createApplication.mockResolvedValueOnce({ id: "app-1" } as any);
      const res = await controller.createApplication(makeReq(), dto);
      expect(service.createApplication).toHaveBeenCalledWith("sch-1", expect.any(Object));
      expect(res).toEqual({ id: "app-1" });
    });
  });

  describe("getApplications", () => {
    it("calls service.getApplications with schoolId and optional status", async () => {
      service.getApplications.mockResolvedValueOnce([] as any);
      await controller.getApplications(makeReq(), "PENDING");
      expect(service.getApplications).toHaveBeenCalledWith("sch-1", "PENDING");
    });
  });

  describe("getApplication", () => {
    it("delegates to service.getApplication", async () => {
      service.getApplication.mockResolvedValueOnce({ id: "app-1" } as any);
      await controller.getApplication("app-1");
      expect(service.getApplication).toHaveBeenCalledWith("app-1");
    });
  });

  describe("updateStatus", () => {
    it("injects reviewedBy from JWT user id", async () => {
      const dto = { status: "OFFERED" } as any;
      service.updateApplicationStatus.mockResolvedValueOnce({} as any);
      await controller.updateStatus(makeReq(), "app-1", dto);
      expect(service.updateApplicationStatus).toHaveBeenCalledWith(
        "app-1",
        expect.objectContaining({ reviewedBy: "user-1" }),
      );
    });
  });

  describe("uploadDocument", () => {
    it("delegates to service.uploadDocument", async () => {
      service.uploadDocument.mockResolvedValueOnce({} as any);
      await controller.uploadDocument("app-1", { type: "BIRTH_CERT", url: "https://s3/doc.pdf" });
      expect(service.uploadDocument).toHaveBeenCalledWith("app-1", { type: "BIRTH_CERT", url: "https://s3/doc.pdf" });
    });
  });

  describe("confirmAdmission", () => {
    it("delegates to service.confirmAdmission", async () => {
      service.confirmAdmission.mockResolvedValueOnce({} as any);
      await controller.confirmAdmission("app-1");
      expect(service.confirmAdmission).toHaveBeenCalledWith("app-1");
    });
  });

  describe("getFunnel", () => {
    it("calls service.getFunnelReport with schoolId", async () => {
      service.getFunnelReport.mockResolvedValueOnce({} as any);
      await controller.getFunnel(makeReq());
      expect(service.getFunnelReport).toHaveBeenCalledWith("sch-1");
    });
  });
});
