/**
 * Parent Portal — Dashboard page tests
 * Uses React Testing Library with mocked react-query and API client.
 *
 * Note: this portal uses useChildStore (not useAuthStore) and fetches
 * from /students/:childId/dashboard-summary.
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock api client
jest.mock("@/lib/api", () => ({
  api: {
    get: jest.fn(),
  },
}));

// Mock child store — provide a valid activeChildId so the query fires
jest.mock("@/store/child.store", () => ({
  useChildStore: jest.fn((selector: (s: any) => any) =>
    selector({ activeChildId: "child-123" })
  ),
}));

import { api } from "@/lib/api";
import DashboardPage from "@/app/(dashboard)/dashboard/page";

const mockedApi = api as jest.Mocked<typeof api>;

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0 } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("Parent DashboardPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the dashboard heading", () => {
    mockedApi.get.mockReturnValue(new Promise(() => {}));
    renderWithQuery(<DashboardPage />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText(/Overview for your child/i)).toBeInTheDocument();
  });

  it("renders all six stat card labels while loading", () => {
    mockedApi.get.mockReturnValue(new Promise(() => {}));
    renderWithQuery(<DashboardPage />);

    expect(screen.getByText("Attendance")).toBeInTheDocument();
    expect(screen.getByText("Fee Due")).toBeInTheDocument();
    expect(screen.getByText("Homework Due")).toBeInTheDocument();
    expect(screen.getByText("Upcoming Exam")).toBeInTheDocument();
    expect(screen.getByText("Last Result")).toBeInTheDocument();
    expect(screen.getByText("Bus Status")).toBeInTheDocument();
  });

  it("shows real dashboard data after successful API response", async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        attendancePercent: 92,
        feeDue: 12000,
        homeworkDue: 3,
        nextExam: "Mathematics",
        nextExamDate: "2026-05-15",
        lastResult: "88%",
        lastResultExam: "Science Mid-Term",
        busStatus: "On Route",
        busEta: "8:15 AM",
        alerts: [],
        recentAnnouncements: [],
      },
    });

    renderWithQuery(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("92%")).toBeInTheDocument();
    });

    expect(screen.getByText("Mathematics")).toBeInTheDocument();
    expect(screen.getByText("On Route")).toBeInTheDocument();
  });

  it("calls the correct API endpoint with the active child ID", async () => {
    mockedApi.get.mockResolvedValue({ data: {} });
    renderWithQuery(<DashboardPage />);

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith("/students/child-123/dashboard-summary");
    });
  });

  it("renders alerts section when alerts are present", async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        attendancePercent: 60,
        feeDue: 5000,
        homeworkDue: 1,
        nextExam: "—",
        nextExamDate: "",
        lastResult: "—",
        lastResultExam: "",
        busStatus: "—",
        busEta: null,
        alerts: ["Attendance below 75% — please attend regularly."],
        recentAnnouncements: [],
      },
    });

    renderWithQuery(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Alerts")).toBeInTheDocument();
    });
    expect(screen.getByText("Attendance below 75% — please attend regularly.")).toBeInTheDocument();
  });

  it("renders recent announcements when present", async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        attendancePercent: 88,
        feeDue: 0,
        homeworkDue: 0,
        nextExam: "—",
        nextExamDate: "",
        lastResult: "A1",
        lastResultExam: "Annual Exam",
        busStatus: "On Time",
        busEta: null,
        alerts: [],
        recentAnnouncements: [
          { id: "a1", title: "School Closed on Monday", publishedAt: "2026-05-05T10:00:00Z" },
        ],
      },
    });

    renderWithQuery(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Recent Announcements")).toBeInTheDocument();
    });
    expect(screen.getByText("School Closed on Monday")).toBeInTheDocument();
  });

  it("shows no-child message when activeChildId is null", () => {
    const { useChildStore } = require("@/store/child.store");
    useChildStore.mockImplementation((selector: (s: any) => any) =>
      selector({ activeChildId: null })
    );

    renderWithQuery(<DashboardPage />);

    expect(
      screen.getByText(/No child linked to your account/i)
    ).toBeInTheDocument();
  });
});
