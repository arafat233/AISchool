/**
 * Management Portal — Dashboard page tests
 * Uses React Testing Library with mocked axios calls.
 *
 * Note: this portal uses axios directly (not react-query) with useEffect,
 * fetching from three separate SAAS API endpoints.
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import axios from "axios";

// Mock axios globally
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

import ManagementDashboard from "@/app/(dashboard)/dashboard/page";

describe("Management DashboardPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    localStorageMock.setItem("mgmt_token", "test-token");
  });

  it("shows loading state before data resolves", () => {
    mockedAxios.get.mockReturnValue(new Promise(() => {}));
    render(<ManagementDashboard />);

    expect(screen.getByText(/Loading dashboard/i)).toBeInTheDocument();
  });

  it("renders Management Dashboard heading after data loads", async () => {
    mockedAxios.get
      .mockResolvedValueOnce({ data: { totalSchools: 5, totalStudents: 2000, attendanceAvgPct: 87, activeAdmissions: 12 } })
      .mockResolvedValueOnce({ data: { totalRevenueMtd: 500000, totalPendingFees: 80000 } })
      .mockResolvedValueOnce({ data: { services: [] } });

    render(<ManagementDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Management Dashboard")).toBeInTheDocument();
    });
    expect(screen.getByText(/Multi-school overview/i)).toBeInTheDocument();
  });

  it("renders all four KPI stat card titles", async () => {
    mockedAxios.get
      .mockResolvedValueOnce({ data: { totalSchools: 3, totalStudents: 1500, attendanceAvgPct: 78, activeAdmissions: 5 } })
      .mockResolvedValueOnce({ data: { totalRevenueMtd: 300000, totalPendingFees: 45000 } })
      .mockResolvedValueOnce({ data: { services: [] } });

    render(<ManagementDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Total Schools")).toBeInTheDocument();
    });

    expect(screen.getByText("Total Students")).toBeInTheDocument();
    expect(screen.getByText("Revenue MTD")).toBeInTheDocument();
    expect(screen.getByText("Avg Attendance")).toBeInTheDocument();
  });

  it("renders real KPI values from API", async () => {
    mockedAxios.get
      .mockResolvedValueOnce({ data: { totalSchools: 7, totalStudents: 3200, attendanceAvgPct: 91, activeAdmissions: 20 } })
      .mockResolvedValueOnce({ data: { totalRevenueMtd: 750000, totalPendingFees: 120000 } })
      .mockResolvedValueOnce({ data: { services: [] } });

    render(<ManagementDashboard />);

    await waitFor(() => {
      expect(screen.getByText("7")).toBeInTheDocument();
    });

    expect(screen.getByText("91%")).toBeInTheDocument();
  });

  it("renders Outstanding Fees and System Health sections", async () => {
    mockedAxios.get
      .mockResolvedValueOnce({ data: { totalSchools: 2, totalStudents: 800, attendanceAvgPct: 80, activeAdmissions: 3 } })
      .mockResolvedValueOnce({ data: { totalRevenueMtd: 200000, totalPendingFees: 30000 } })
      .mockResolvedValueOnce({ data: { services: [] } });

    render(<ManagementDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Outstanding Fees")).toBeInTheDocument();
    });

    expect(screen.getByText("System Health")).toBeInTheDocument();
    expect(screen.getByText("Active Admissions")).toBeInTheDocument();
  });

  it("renders system health service statuses when services are returned", async () => {
    mockedAxios.get
      .mockResolvedValueOnce({ data: { totalSchools: 4, totalStudents: 1800, attendanceAvgPct: 85, activeAdmissions: 10 } })
      .mockResolvedValueOnce({ data: { totalRevenueMtd: 400000, totalPendingFees: 60000 } })
      .mockResolvedValueOnce({
        data: {
          services: [
            { service: "ops-service", status: "ok" },
            { service: "report-service", status: "down" },
          ],
        },
      });

    render(<ManagementDashboard />);

    await waitFor(() => {
      expect(screen.getByText("ops-service")).toBeInTheDocument();
    });

    expect(screen.getByText("report-service")).toBeInTheDocument();
    expect(screen.getByText("ok")).toBeInTheDocument();
    expect(screen.getByText("down")).toBeInTheDocument();
  });

  it("renders gracefully when all API calls fail", async () => {
    mockedAxios.get.mockRejectedValue(new Error("Network error"));

    render(<ManagementDashboard />);

    await waitFor(() => {
      // After rejections resolve to fallback values, loading ends and dashboard shows
      expect(screen.getByText("Management Dashboard")).toBeInTheDocument();
    });

    // Fallback values: 0 schools
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
