---
name: upload
description: >-
  Publish changes to Alice's Hugo site: compress new images, strip photo
  metadata, validate image filenames, then show a summary of the changes and
  the proposed commit title and wait for the user's confirmation before git
  commit / push. Use whenever the user says "commit and push", "commit",
  "push", "幫我上傳", "上傳", "Upload", "publish this post", or similar. In this
  repo, use this skill instead of any generic commit-and-push skill.
---

# Upload a blog post

Run these steps in order. Report what each step did. Stop and ask the user at
the explicit checkpoints below. **Never commit or push before the user has
confirmed at the "Confirm before commit" checkpoint** — the trigger phrase
("commit and push", "upload", ...) is not itself that confirmation.

## 1 + 3. Compress images and strip metadata

```bash
bash .claude/skills/upload/scripts/prep-images.sh
```

- Resizes new/modified JPG/PNG under `static/images/` so the long edge is 1440px
  (portrait -> height, landscape -> width). Never upscales. Skips GIFs.
- Then runs the user's exiftool command on the whole `static/images/` tree:
  `exiftool -all= -tagsfromfile @ -icc_profile -overwrite_original .../static/images/ -r`

Relay the resize summary. If a file could not be read (`??` line), tell the user.

## 2. Check image filenames (case + slashes)

```bash
python3 .claude/skills/upload/scripts/check-image-refs.py
```

Checks every image reference (`cover = '...'`, `![](...)`, `src="..."`) in each
new/modified post, including the cover image:

- must start with a leading `/`
- must have no trailing `/`
- the file must exist on disk with **exact** case (Mac ignores case, GitHub
  Pages does not)

**If problems are found:** fix them in the Markdown so the reference matches the
actual file on disk — correct the case, add the missing leading slash, remove a
trailing slash. Do **not** rename files on disk. Re-run the script until it
passes. Show the user each edit you made.

## Checkpoint: draft flag

Check each new/modified post's front matter for `draft = true`:

```bash
git status --porcelain --untracked-files=all | sed -E 's/^.{3}//' \
  | grep -E '^"?content/posts/.*\.md' | sed -E 's/^"//; s/"$//' \
  | while read -r f; do grep -Hn '^draft' "$f"; done
```

If any post being uploaded still has `draft = true`, ask the user whether to set
it to `false` (a `draft = true` post pushes fine but never appears on the live
site). Only flip it if they say yes. This question can be asked together with
the confirmation below.

## 4. Checkpoint: confirm before commit (always)

Do not run `git add`, `git commit`, or `git push` yet.

1. Look at what changed: `git status --porcelain --untracked-files=all` and
   `git diff` (read the diff of modified posts so the summary describes the
   actual content change, not just the file names).
2. Compose the commit title. Convention from history: `Add <Name> Post`
   (e.g. `Add Robins Post`). Use the English post's `title` when there is a
   `.en.md`; otherwise summarise the topic in a few words. For changes that are
   not a new post, write a short imperative title describing the change.
3. Tell the user, in the language they are writing in, then **stop and wait**:
   - **What changed this time** — a short plain-language summary (new post,
     edits to an existing post and what was edited, images added / resized /
     deleted, config or theme changes), followed by the list of files.
   - **Anything that looks off** — unrelated files, several posts at once,
     deletions (say whether anything still references the deleted file),
     image-reference problems that could not be auto-fixed.
   - **The commit title you will use.**
   - Ask whether it is OK to commit and push.

## 5 + 6. Commit and push (only after the user says yes)

- If the user asks for a different title or for files to be left out, adjust and
  show the updated plan; proceed once they have agreed to it.
- If new changes appear in the working tree after the confirmation, show them
  and confirm again.

Then:

1. `git add -A` (or only the agreed files, if the user excluded some)
2. `git commit -m "<title>"` with the trailer below, then `git push`.
3. Report the result (commit hash, title) and remind the user the GitHub Actions
   build takes a couple of minutes to go live.

Commit message trailer: end with a `Co-Authored-By:` line naming the Claude
model actually running the session (as given in the session's attribution
instructions), e.g. `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
