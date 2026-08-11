import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "@fontsource/montserrat/latin-400.css";
import "@fontsource/oswald/latin-400.css";
import "@fontsource/oswald/latin-500.css";
import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/motion.css";
import "./styles/navigation.css";
import "./styles/hero.css";
import "./styles/portfolio.css";
import "./styles/case-study.css";
import "./styles/about.css";
import "./styles/contact.css";
import { createAppRouter } from "./app/router";
import "./animations/gsap";

const router = createAppRouter();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
