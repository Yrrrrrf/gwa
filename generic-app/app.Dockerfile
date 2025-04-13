FROM denoland/deno:2.2.9

# The port that your SvelteKit application will listen on
EXPOSE 3000

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

# Ensure deno user owns the application files
RUN chown -R deno:deno /app

# Switch to deno user for security
USER deno

# Build the SvelteKit application
RUN deno task build

# Run the SvelteKit application
CMD ["run", "--allow-net", "--allow-read", "--allow-env", "npm:vite", "dev"]
# CMD ["run", "--allow-net", "--allow-read", "--allow-env", "npm:vite", "preview"]
# CMD ["run", "--allow-net", "--allow-read", "--allow-env", "npm:vite", "preview", "--host", "0.0.0.0", "--port", "3000"]
