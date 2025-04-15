FROM denoland/deno:2.2.9

# The port that your SvelteKit application will listen on
EXPOSE 3000
EXPOSE 1420
EXPOSE 1421

WORKDIR /app

# Start as root user to handle permissions
USER root

# Copy package configuration files
COPY deno.json .
COPY svelte.config.js .
COPY vite.config.ts .
COPY tsconfig.json .

# Copy source code
COPY src/ ./src/
COPY static/ ./static/

# Pre-install dependencies to node_modules
RUN deno cache --node-modules-dir npm:vite npm:@sveltejs/kit npm:@tailwindcss/vite npm:tailwindcss

# Ensure deno user owns the application files
RUN chown -R deno:deno /app

# Switch to deno user for security
# USER deno

# Run the SvelteKit application with ALL permissions granted
CMD ["run", "--allow-all", "--node-modules-dir", "npm:vite", "dev", "--host", "0.0.0.0"]
