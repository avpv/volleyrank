# Team Optimizer Library (Local Copy)

This is a local copy of the [team-optimizer](https://github.com/avpv/team-optimizer) library.

**Source Repository**: https://github.com/avpv/team-optimizer

## Why Local Copy?

We use a local copy instead of git submodule because:
- GitHub Pages doesn't support submodules by default
- Simpler deployment (no need for GitHub Actions)
- Guaranteed compatibility (files are always present)

## Updating

To update to the latest version from team-optimizer repository:

```bash
# Clone latest team-optimizer
git clone https://github.com/avpv/team-optimizer.git /tmp/team-optimizer

# Copy files
cp -r /tmp/team-optimizer/src/* src/lib/team-optimizer/src/

# Commit changes
git add src/lib/team-optimizer
git commit -m "Update team-optimizer library"
git push
```

## Library Details

- **Source**: https://github.com/avpv/team-optimizer
- **License**: MIT
- **Author**: avpv
