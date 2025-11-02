## Security: rotating leaked keys & preventing future leaks

This repository previously had an API key committed. Follow these steps immediately to secure your project and prevent future leaks.

1) Rotate leaked keys at the provider(s)
   - OpenAI: revoke the exposed key in the OpenAI dashboard (https://platform.openai.com/account/api-keys) and create a new key.
   - Any other providers (Firecrawl, AWS, etc): rotate/revoke keys and create new credentials.

2) Update local development secrets
   - Add the new keys to your local `.env.local` (this file is already ignored by git):

     ```env
     OPENAI_API_KEY=sk_...new_key_here
     FIRECRAWL_API_KEY=...new_key_here
     ```

   - Restart the dev server after updating `.env.local`.

3) Update deployment secrets
   - Add the rotated keys in your hosting provider (Vercel / Netlify / Cloud Run / ECS). Do NOT commit keys to the repo.

4) Remove sensitive data from git history (already attempted)
   - If history still contains secrets, use `git filter-repo` or `git filter-branch` to remove them and force-push.
   - Notify collaborators to re-clone or run `git fetch origin && git reset --hard origin/main` to avoid reintroducing secrets.

5) Prevent accidental future leaks (automated checks)
   - Install the included pre-commit hook to block commits with likely secrets:

     ```bash
     # from repo root
     sh scripts/install-git-hooks.sh
     ```

   - You can also run the secret scanner manually:

     ```bash
     node scripts/check-secrets.js
     ```

6) Add CI checks
   - Add a GitHub Action to run `node scripts/check-secrets.js` on PRs to block merges containing secrets.

7) Monitor and alert
   - Add billing alerts for OpenAI and other paid services to avoid accidental charges.

If you'd like, I can:
 - Create a GitHub Action that runs `node scripts/check-secrets.js` on PRs
 - Add a mapping of common error codes to friendly UI messages
 - Implement an automatic cached fallback for field-generation when all LLMs fail
