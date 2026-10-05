import type { Tour } from "nextstepjs";

/* Guided tour (section 16): nextstepjs 2.2.0. One step per key control, chapters of 5 to 7 steps,
   copy names the control and the outcome. Replace this sample with steps that teach real tasks. */
export const tours: Tour[] = [
  {
    tour: "getting-started",
    steps: [
      { icon: null, title: "Open the dashboard", content: "Start here to see event volume and source health for your tenant.", selector: "#nav-dashboard", side: "right", showControls: true, showSkip: true },
      { icon: null, title: "Read the key numbers", content: "These tiles show today's events, active sources and open cases.", selector: "#kpi-grid", side: "bottom", showControls: true, showSkip: true, nextRoute: "/dashboard" },
      { icon: null, title: "Find a failing source", content: "Open Items, then Failed, to list sources that stopped sending events.", selector: "#nav-items", side: "right", showControls: true, showSkip: true },
      { icon: null, title: "Switch theme", content: "Click the sun or moon to switch between dark and light. Your choice is saved for this module.", selector: "#btn-theme", side: "bottom", showControls: true, showSkip: true },
      { icon: null, title: "Jump to another product", content: "Open the apps menu to move to any licensed Invinsense product.", selector: "#btn-apps", side: "bottom", showControls: true, showSkip: true },
    ],
  },
];
