import { render, screen } from "@testing-library/react";
import { isValidElement } from "react";
import AppPage, { metadata as appMetadata } from "@/app/app/page";
import RootLayout, { metadata as rootMetadata } from "@/app/layout";
import HomePage from "@/app/page";

jest.mock("@/components/AppExperience", () => () => <div>App Experience Stub</div>);
jest.mock("@/components/LandingPage", () => () => <div>Landing Page Stub</div>);

describe("page wrappers and layout", () => {
  it("renders the landing and app pages", () => {
    render(<HomePage />);
    expect(screen.getByText("Landing Page Stub")).toBeInTheDocument();

    render(<AppPage />);
    expect(screen.getByText("App Experience Stub")).toBeInTheDocument();
  });

  it("renders the root layout and exports metadata", () => {
    const layout = RootLayout({ children: <div>Child content</div> });

    expect(isValidElement(layout)).toBe(true);
    expect(layout.type).toBe("html");
    expect(layout.props.lang).toBe("en");
    expect(rootMetadata.title).toContain("PassStack");
    expect(appMetadata.title).toContain("PassStack App");
  });
});
