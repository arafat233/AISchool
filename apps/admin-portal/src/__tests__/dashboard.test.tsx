/**
 * Admin Portal — Dashboard page tests
 * Uses React Testing Library with mocked react-query and API client.
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock recharts so canvas rendering doesn't break in jsdom
jest.mock("recharts", () => {
  const React = require("react");
  return {
    ResponsiveContainer: ({ children }: any) => <div data-testid="chart">{children}</div>,
    BarChart: ({ children }: any) => <div>{children}</div>,
    Bar: () => null,
    LineChart: ({ children }: any) => <div>{children}</div>,
    Line: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
  };
});

// Mock api client
jest.mock("@/lib/api", () => ({
  api: {
    get: jest.fn(),
  },
}));

import { api } from "@/lib/api";
import DashboardPage from "@/app/(dashboard)/dashboard/page";

const mockedApi = api as jest.Mocked<typeof api>;

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0 } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("DashboardPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders placeholder data while loading", () => {
    // api.get never resolves — shows placeholderData
    mockedApi.get.mockReturnValue(new Promise(() => {}));
    renderWithQuery(<DashboardPage />);

    // Placeholder: totalStudents=450, todayAttendance=87%
    expect(screen.getByText("450")).toBeInTheDocument();
    expect(screen.getByText("87%")).toBeInTheDocument();
  });

  it("renders real stats after successful API response", async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        totalStudents: 520,
        activeStudents: 510,
        totalStaff: 42,
        todayAttendance: 91,
        outstandingFees: 280000,
        collectedThisMonth: 1450000,
        belowThresholdCount: 8,
      },
    });

    renderWithQuery(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("520")).toBeInTheDocument();
    });

    expect(screen.getByText("91%")).toBeInTheDocument();
  });

  it("shows section headings", () => {
    mockedApi.get.mockReturnValue(new Promise(() => {}));
    renderWithQuery(<DashboardPage />);

    expect(screen.getByText(/Quick Actions/i)).toBeInTheDocument();
    expect(screen.getByText(/Staff Overview/i)).toBeInTheDocument();
  });

  it("renders quick action links", () => {
    mockedApi.get.mockReturnValue(new Promise(() => {}));
    renderWithQuery(<DashboardPage />);

    expect(screen.getByText("Add Student")).toBeInTheDocument();
    expect(screen.getByText("Mark Attendance")).toBeInTheDocument();
    expect(screen.getByText("Generate Invoices")).toBeInTheDocument();
  });

  it("renders chart containers", () => {
    mockedApi.get.mockReturnValue(new Promise(() => {}));
    renderWithQuery(<DashboardPage />);

    expect(screen.getByText(/This Week.*Attendance/i)).toBeInTheDocument();
    expect(screen.getByText(/Fee Collection Trend/i)).toBeInTheDocument();
  });

  it("calls the correct API endpoint", async () => {
    mockedApi.get.mockResolvedValue({ data: {} });
    renderWithQuery(<DashboardPage />);

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith("/admin/dashboard/stats");
    });
  });
});
