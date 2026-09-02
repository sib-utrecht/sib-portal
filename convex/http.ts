import { httpRouter } from "convex/server";
import { registerLegacyRoutes } from "./legacy/http";

const http = httpRouter();
registerLegacyRoutes(http);

export default http;
