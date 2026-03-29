import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Providers } from "../app/providers";
import { ConvexClientProvider } from "../app/ConvexClientProvider";
import App from "./App";
import "../app/globals.css";

const base = import.meta.env.BASE_URL;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={base === "/" ? undefined : base}>
      <Providers>
        <ConvexClientProvider>
          <App />
        </ConvexClientProvider>
      </Providers>
    </BrowserRouter>
  </StrictMode>,
);
