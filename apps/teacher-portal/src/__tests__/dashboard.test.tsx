/**
 * Teacher Portal — Dashboard page tests
 * Uses React Testing Library with mocked react-query and API client.
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

// Mock auth store
jest.mock("@/store/auth.store", () => ({
  useAuthStore: jest.fn((selector: (s: any) => any) =>
    selector({ user: { firstName: "Alice", lastName: "Smith" } })
  ),
}));

import { api } from "@/lib/api";
import DashboardPage from "@/app/(dashboard)/dashboard/page";

const mockedApi = api as jest.Mocked<typeof api>;

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0 } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("Teacher DashboardPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders stat section headings while loading (placeholderData)", () => {
    mockedApi.get.mockReturnValue(new Promise(() => {}));
    renderWithQuery(<DashboardPage />);

    expect(screen.getByText("My Classes")).toBeInTheDocument();
    expect(screen.getByText("Classes Today")).toBeInTheDocument();
    expect(screen.getByText("Pending Attendance")).toBeInTheDocument();
    expect(screen.getByText("Substitute Alerts")).toBeInTheDocument();
  });

  it("renders schedule and tasks panel headings while loading", () => {
    mockedApi.get.mockReturnValue(new Promise(() => {}));
    renderWithQuery(<DashboardPage />);

    expect(screen.getByText("Today's Schedule")).toBeInTheDocument();
    expect(screen.getByText("Pending Tasks")).toBeInTheDocument();
  });

  it("renders placeholder schedule periods", () => {
    mockedApi.get.mockReturnValue(new Promise(() => {}));
    renderWithQuery(<DashboardPage />);

    // Placeholder upcomingPeriods include "Mathematics" × 3
    const mathItems = screen.getAllByText("Mathematics");
    expect(mathItems.length).toBeGreaterThanOrEqual(1);
  });

  it("shows real API data after successful query", async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        totalClasses: 8,
        classesToday: 4,
        pendingAttendance: 1,
        leaveStatus: null,
        substituteAlerts: 2,
        upcomingPeriods: [
          { time: "9:00 AM", subject: "Physics", class: "Grade 10", section: "A" },
        ],
        pendingTasks: [
          { id: "t1", label: "Mark attendance — Grade 10A", href: "/attendance", urgent: true },
        ],
      },
    });

    renderWithQuery(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Physics")).toBeInTheDocument();
    });

    expect(screen.getByText("Mark attendance — Grade 10A")).toBeInTheDocument();
  });

  it("calls the correct API endpoint", async () => {
    mockedApi.get.mockResolvedValue({ data: {} });
    renderWithQuery(<DashboardPage />);

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith("/teacher/dashboard");
    });
  });

  it("renders quick action links with correct hrefs", () => {
    mockedApi.get.mockReturnValue(new Promise(() => {}));
    renderWithQuery(<DashboardPage />);

    const markAttendanceLink = screen.getByRole("link", { name: /Mark Attendance/i });
    expect(markAttendanceLink).toHaveAttribute("href", "/attendance");

    const applyLeaveLink = screen.getByRole("link", { name: /Apply Leave/i });
    expect(applyLeaveLink).toHaveAttribute("href", "/leave");

    const timetableLink = screen.getByRole("link", { name: /View Timetable/i });
    expect(timetableLink).toHaveAttribute("href", "/timetable");

    const classesLink = screen.getByRole("link", { name: /My Classes/i });
    expect(classesLink).toHaveAttribute("href", "/classes");
  });
});
