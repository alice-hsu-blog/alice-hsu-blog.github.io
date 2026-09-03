---
name: upload
description: >-
  Publish a blog post for Alice's Hugo site: compress new images, strip photo
  metadata, validate image filenames, then git add / commit / push. Use whenever
  the user says "幫我上傳", "上傳", "Upload", "publish this post", or similar.
---

# Upload a blog post

Run these steps in order. Report what each step did. Stop and ask the user only
at the explicit checkpoints below.

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

If any post being uploaded still has `draft = true`, **stop and ask** the user
whether to set it to `false` (a `draft = true` post pushes fine but never
appears on the live site). Only flip it if they say yes.

## 4 + 5 + 6. Commit and push

1. `git add -A`
2. Compose the commit message. Convention from history: `Add <Name> Post`
   (e.g. `Add Robins Post`). Use the English post's `title` when there is a
   `.en.md`; otherwise summarise the topic in a few words. For changes that are
   not a new post, write a short imperative message describing the change.
3. Show the user: the list of files staged, and the commit message you'll use.
4. `git commit -m "<message>"` then `git push`.
5. Report the result and remind the user the GitHub Actions build takes a couple
   of minutes to go live.

Commit message trailer: end with
`Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`

## Stop and ask before pushing if

- the staged file set looks wrong (unrelated files, many posts at once you did
  not expect, deletions you cannot explain)
- image-reference problems could not be auto-fixed
- a `draft = true` post is in the set and the user has not decided
