---
status: superseded by ADR-0015
supersedes: ADR-0005's label grammar and region names
---

# One label carries a whole Placement, and a thing may carry several

[ADR-0005](0005-placement-protocol.md) made Placement a **pair** of labels:
`page:<name>` and `region:<name>`, both required. That pair cannot express the
same thing appearing on two Pages, because Home Assistant's labels are a flat
unordered set with no values of their own. Placement becomes **one fused
label**, `page:<page>:<region>`, and a thing may carry as many as it has
Placements. The four Regions are renamed so that no Region slug contains an
underscore.

## Why the pair had to go

The pair works for exactly one Placement. Ask for two and it collapses:

```
area salone: [page:main, region:right, page:cucina, region:footer]
```

A set has no pairing. That reads equally as "a Row on main and a footer block
on cucina" or "a footer block on main and a Row on cucina", and nothing in the
label data distinguishes them. The binding between the two halves lives only in
the order a human wrote them in, which Home Assistant does not keep.

Worse, the resolver treated a doubled `page:` or `region:` as malformed and
rendered **nothing** — so a house-editor reaching for the obvious "put it on
the second page too" made the thing disappear from the page where it already
worked. Adding a Placement removed one. That is the failure mode that forced
this ADR.

The need is not hypothetical. `media_player.ovunque` belongs in the footer of
every Page. An Area is naturally a Row on `page:main` *and* a nav block in
another Page's footer. The protocol's renderer-supplied "Casa" block exists
precisely because "this thing, on every Page" was inexpressible — it is a
hardcoded workaround for the general case this ADR opens up.

## The decision

**One label, both coordinates**: `page:<page>:<region>`. The `page:` prefix
stays, so the labels a house already carries keep their leading token and the
picker still groups them together.

**A thing may carry several.** Each is one Placement, resolved independently.
`page:main:right` and `page:cucina:footer` on the same Area give it a Row on
one Page and a nav block on another — the Region decides the shape per
Placement, exactly as ADR-0005 established.

**Exact duplicates dedupe, at collection time.** Two Placements naming the same
Page *and* Region render once. Two naming the same Page and different Regions
render in both — that is a legitimate layout, not a mistake.

**The Regions are renamed**: `glance`, `left`, `right`, `footer`.
`entities-left` and `entities-right` are gone.

## Why the rename — it is parsing, not taste

Home Assistant slugifies a Label's *name* into its id, collapsing `:` and `-`
alike into `_`. So `page:main:entities-right` arrives at the frontend as
`page_main_entities_right`: one flat string, with no surviving mark of where
the Page name ended and the Region began. `entities_right` contains an
underscore of its own, so the parser cannot simply split at the last one.

Two ways out:

1. **Right-anchored longest match** — strip `page_`, test the tail against the
   four known Region slugs longest-first, and whatever remains in front is the
   Page name. Works, because the Region vocabulary is closed. Costs a
   longest-match table and a new protocol constraint: *a Page name may not end
   in a Region slug*.
2. **Rename the Regions** so no slug contains an underscore. Then the split is
   unambiguously at the last underscore, with no table and no constraint on
   Page names.

We took 2. The parsing rule becomes a one-liner that cannot be got subtly
wrong, and no Page name is ever forbidden. `REGION_BY_SLUG` — which exists in
the first place because matching a slug against a hyphenated literal silently
placed nothing in the two hyphenated Regions (#12) — stops being a workaround
for a collapse and becomes a plain lookup.

The cost is real and worth naming: `left` and `right` are positional where
`glance` and `footer` are functional, so the four names no longer read as one
family, and `entities-` no longer signals "this Region holds entities". Against
that, `left` and `right` are the words someone standing in front of a 2×2 wall
panel actually uses when deciding where a thing goes — and that phone-side
moment is where the vocabulary is spent.

## Considered and rejected

**An additive second grammar** — keep `page:`+`region:` for the single case and
add `also:<page>:<region>` for the rest. Rejected: two grammars for one
concept, forever. Every reader learns both, every validator implements both,
and the second never goes away. The flat-set ambiguity is the protocol saying
the split itself was wrong, not that it needed a companion.

**Indexed pairs** — `page1:`/`region1:`, `page2:`/`region2:`. Rejected: the
index is a naked sequence number carrying no meaning, maintained by hand in a
phone UI, and it rots the moment someone deletes the first Placement and leaves
a `page2:` behind.

**Keeping `region:` as an inert legacy label.** Rejected: a label that looks
assignable and places nothing is a trap for whoever labels the next device.
There is nobody to be backward-compatible with — the panel is not live — so
`region:*` is deleted from the registry outright.

**Distinguishing "nothing labelled" from "everything malformed"** on an empty
Page. Rejected: it would mean retaining and counting things the resolver
decided not to honour, purely to phrase a message better. The empty-Page
message is true either way and the reader's next action — go look at the labels
— is identical.

## Consequences

**The label registry multiplies.** Under the pair, a new Page was one new
label, combining with the four existing `region:` labels for free. Now each
Page×Region combination is its own registry entry, created when first needed:
up to four per Page instead of one. We do **not** pre-create the four, because
a registry full of labels that place nothing clutters the very picker the
house-editor is looking at.

The trade runs the other way per *assignment*: a Placement is now one label
instead of two, halving the per-entity labelling cost that
[docs/protocol.md](../protocol.md)'s "What this costs" has always owned. More
registry entries, fewer assignments.

**Typos have one more place to hide.** A single label now carries two
coordinates, and `page:main:rigth` is malformed in a way that still renders
nothing, silently (ADR-0005's choice, deliberately reaffirmed here). Finding it
still means noticing something missing from the panel.

**A self-referential footer block is now skipped.** `area corridoio` carrying
`page:corridoio:footer` would be a nav block, on `page:corridoio`, that opens
`page:corridoio`. It was expressible before and is far more likely now that
"put every Area in every Page's footer" is a one-label-each move. The resolver
skips it: a nav block that does not navigate is the dead-control-that-looks-live
that ADR-0006 exists to avoid, and the footer is the panel's scarcest strip.

**ADR-0005 is not rewritten, and neither are 0006 or 0007.** They record
decisions as they were made, in the vocabulary of their day. This ADR carries
the rename; a reader meeting `entities-right` in an older ADR needs one pointer,
which is this line, not three edited documents.

**`ignored` is untouched.** It mutes the whole thing, every Placement at once.
Its purpose is temporary removal of a *device* from the panel, and a
per-Placement mute would be new grammar for something already achievable by
deleting one label.

**Area navigation is untouched.** A footer Area block still opens
`page:<that area's registry id>`. Page names remain bare strings in code; they
are simply never written as bare strings in labels any more.
