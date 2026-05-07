import "@testing-library/jest-dom";

// Suppress next/navigation mock warnings
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

// Mock next/link
jest.mock("next/link", () =>
  function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  },
);
