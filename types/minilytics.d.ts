declare global {
  interface Window {
    minilytics?: ((
      cmd: "goal" | "identify" | "pageview",
      a?: unknown,
      b?: unknown
    ) => void) & {
      attribution?: () => { ml_visitor_id?: string; ml_session_id?: string };
    };
  }
}

export {};
