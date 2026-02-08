/// <reference types="cypress" />

describe("/activity feed", () => {
  const apiBase = "**/api/v1";

  function stubStreamEmpty() {
    cy.intercept(
      "GET",
      `${apiBase}/activity/task-comments/stream*`,
      {
        statusCode: 200,
        headers: {
          "content-type": "text/event-stream",
        },
        body: "",
      },
    ).as("activityStream");
  }

  function assertSignedInAndLanded() {
    cy.contains(/live feed/i, { timeout: 30_000 }).should("be.visible");
  }

  it("auth negative: wrong OTP keeps us on sign-in", () => {
    cy.visit("/activity");

    // Protected route should redirect to Clerk sign-in.
    cy.location("pathname", { timeout: 20_000 }).should("match", /\/sign-in/);

    // Override OTP just for this test.
    Cypress.env("CLERK_TEST_OTP", "000000");

    // Expect login flow to fail; easiest assertion is that we remain on sign-in.
    // (The shared helper does not currently expose a typed hook to assert the error text.)
    cy.loginWithClerkOtp();

    cy.location("pathname", { timeout: 30_000 }).should("match", /\/sign-in/);
  });

  it("happy path: renders task comment cards", () => {
    cy.intercept("GET", `${apiBase}/activity/task-comments*`, {
      statusCode: 200,
      body: {
        items: [
          {
            id: "c1",
            message: "Hello world",
            agent_name: "Kunal",
            agent_role: "QA 2",
            board_id: "b1",
            board_name: "Testing",
            task_id: "t1",
            task_title: "CI hardening",
            created_at: "2026-02-07T00:00:00Z",
          },
        ],
      },
    }).as("activityList");

    stubStreamEmpty();

    cy.visit("/activity");
    cy.location("pathname", { timeout: 20_000 }).should("match", /\/sign-in/);

    cy.loginWithClerkOtp();
    assertSignedInAndLanded();

    cy.wait("@activityList");
    cy.contains("CI hardening").should("be.visible");
    cy.contains("Hello world").should("be.visible");
  });

  it("empty state: shows waiting message when no items", () => {
    cy.intercept("GET", `${apiBase}/activity/task-comments*`, {
      statusCode: 200,
      body: { items: [] },
    }).as("activityList");

    stubStreamEmpty();

    cy.visit("/activity");
    cy.location("pathname", { timeout: 20_000 }).should("match", /\/sign-in/);

    cy.loginWithClerkOtp();
    assertSignedInAndLanded();

    cy.wait("@activityList");
    cy.contains(/waiting for new comments/i).should("be.visible");
  });

  it("error state: shows failure UI when API errors", () => {
    cy.intercept("GET", `${apiBase}/activity/task-comments*`, {
      statusCode: 500,
      body: { detail: "boom" },
    }).as("activityList");

    stubStreamEmpty();

    cy.visit("/activity");
    cy.location("pathname", { timeout: 20_000 }).should("match", /\/sign-in/);

    cy.loginWithClerkOtp();
    assertSignedInAndLanded();

    cy.wait("@activityList");
    cy.contains(/unable to load feed|boom/i).should("be.visible");
  });
});
