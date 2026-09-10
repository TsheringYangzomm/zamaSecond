import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import App from "./App";

function migrateLegacyHashRoute() {
  const legacyRoute = window.location.hash;
  if (!legacyRoute.startsWith("#/")) return;

  window.history.replaceState(window.history.state, "", legacyRoute.slice(1));
}

migrateLegacyHashRoute();

const rootRoute = createRootRoute({
  component: App,
  notFoundComponent: App,
});

const route = (path: string) => createRoute({
  getParentRoute: () => rootRoute,
  path,
});

const routeTree = rootRoute.addChildren([
  route("/"),
  route("/shop"),
  route("/shop/$itemSlug"),
  route("/farmers"),
  route("/farmers/$farmerId"),
  route("/contact"),
  route("/partnership"),
  route("/customize"),
  route("/launch-updates"),
  route("/meal-kit-trust"),
  route("/membership"),
  route("/coupons"),
  route("/account"),
  route("/account/orders"),
  route("/account/wallet"),
  route("/account/membership"),
  route("/admin"),
  route("/reset-password"),
  route("/auth/jaggle"),
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultPreloadStaleTime: 30_000,
  scrollRestoration: true,
  trailingSlash: "never",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
