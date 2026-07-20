# Matches .node-version / package.json "engines". Pinned (not :slim-latest or :24)
# so a base-image update can't silently change the runtime out from under a deploy.
FROM node:24.14.1-bookworm-slim

# Chromium's runtime shared libraries. Puppeteer bundles the browser binary itself
# (downloaded during npm install, see .puppeteerrc.cjs) but not these OS-level libs —
# without them Chrome fails to launch even once the binary is present and found.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates fonts-liberation \
    libasound2 libatk-bridge2.0-0 libatk1.0-0 libatspi2.0-0 libcairo2 libcups2 \
    libdbus-1-3 libdrm2 libexpat1 libgbm1 libglib2.0-0 libnspr4 libnss3 \
    libpango-1.0-0 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxdamage1 \
    libxext6 libxfixes3 libxkbcommon0 libxrandr2 xdg-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Own the working directory before dropping root, so npm install (as root, for the
# Chromium download below) and the app's later runtime (as node) both have write access.
RUN chown node:node /app

# Copy only the manifests first so this layer — and the expensive Chromium download
# inside it — is cached by Docker as long as dependencies don't change, independent
# of source edits. .puppeteerrc.cjs must be present at install time: it's what points
# Puppeteer's postinstall download at a project-relative cache dir instead of $HOME,
# which is the mismatch that broke this same install on Render's buildpack.
COPY package.json .puppeteerrc.cjs ./
# --foreground-scripts: npm's default is to run dependency postinstall scripts in the
# background with their output captured, not streamed. In this Docker/BuildKit context
# that silently drops Puppeteer's Chromium download entirely — no error, nothing on
# disk, no indication anything went wrong until the app fails to launch a browser at
# runtime. Running in the foreground is what makes the download actually happen.
RUN npm install --omit=dev --foreground-scripts
# Fail the build loudly here, not the container days later, if Chromium is still missing.
RUN test -d /app/.cache/puppeteer/chrome || (echo "FATAL: Puppeteer's Chromium was not installed" >&2 && exit 1)

COPY server ./server
COPY website ./website

RUN chown -R node:node /app
# Chrome's own setuid sandbox needs root; running the container as non-root instead
# (standard Docker hardening) is what PUPPETEER_NO_SANDBOX=true at runtime is for.
USER node

ENV NODE_ENV=production
# Documents the default; actual bind port still comes from $PORT at runtime
# (Render and most PaaS hosts inject their own).
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.js"]
