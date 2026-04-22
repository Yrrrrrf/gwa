import { deLocalizeUrl } from "@sdk/ui";

export const reroute = (request: Request) =>
    deLocalizeUrl(request.url).pathname;
