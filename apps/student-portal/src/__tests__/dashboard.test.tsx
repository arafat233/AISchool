/**
 * Student Portal — Dashboard page tests
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
    selector({ user: { firstName: "Bob", lastName: "Jones" } })
  ),
}));

// Mock utils (formatCurrency / formatDate are used in render)
jest.mock("@/lib/utils", () => ({
  formatCurrency: (v: number) => `₹${v.toLocaleString()}`,
  formatDate: (d: string) => d,
  cn: (...args: string[]) => args.filter(Boolean).join(" "),
}));

import { api } from "@/lib/api";
import DashboardPage from "@/app/(dashboard)/dashboard/page";

const mockedApi = api as jest.Mocked<typeof api>;

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0 } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("Student DashboardPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders stat section labels while loading (placeholderData)", () => {
    mockedApi.get.mockReturnValue(new Promise(() => {}));
    renderWithQuery(<DashboardPage />);

    expect(screen.getByText("Attendance")).toBeInTheDocument();
    expect(screen.getByText("Pending Fees")).toBeInTheDocument();
    expect(screen.getByText("Upcoming Exams")).toBeInTheDocument();
  });

  it("renders section headings for homework, exams and results", () => {
    mockedApi.get.mockReturnValue(new Promise(() => {}));
    renderWithQuery(<DashboardPage />);

    expect(screen.getAllByText(/Today.*Homework|Homework/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Upcoming Exams/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Recent Results/i)).toBeInTheDocument();
  });

  it("renders placeholder homework items", () => {
    mockedApi.get.mockReturnValue(new Promise(() => {}));
    renderWithQuery(<DashboardPage />);

    // Placeholder has a Mathematics homework entry
    expect(screen.getAllByText("Mathematics").length).toBeGreaterThanOrEqual(1);
  });

  it("shows real API data after successful query", async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        attendancePercent: 90,
        presentDays: 162,
        totalDays: 180,
        pendingFees: 500000,
        pendingFeesCount: 1,
        upcomingExams: [
          { id: "x1", subject: "Chemistry", date: "2026-06-01", type: "Final" },
        ],
        todayHomework: [
          { id: "hw1", subject: "Biology", description: "Read Chapter 4", dueDate: "2026-05-08" },
        ],
        recentResults: [
          { subject: "Physics", marks: 95, maxMarks: 100, grade: "A1" },
        ],
      },
    });

    renderWithQuery(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Chemistry")).toBeInTheDocument();
    });

    expect(screen.getByText("Biology")).toBeInTheDocument();
    expect(screen.getByText("Physics")).toBeInTheDocument();
    expect(screen.getByText("A1")).toBeInTheDocument();
  });

  it("calls the correct API endpoint", async () => {
    mockedApi.get.mockResolvedValue({ data: {} });
    renderWithQuery(<DashboardPage />);

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith("/student/dashboard");
    });
  });

  it("shows low-attendance warning when attendance is below 75%", async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        attendancePercent: 70,
        presentDays: 126,
        totalDays: 180,
        pendingFees: 0,
        pendingFeesCount: 0,
        upcomingExams: [],
        todayHomework: [],
        recentResults: [],
      },
    });

    renderWithQuery(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/below the 75% minimum/i)).toBeInTheDocument();
    });
  });
});
