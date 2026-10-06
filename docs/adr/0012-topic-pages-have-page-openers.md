---
status: superseded by ADR-0015
---

# Topic Pages are reached by Page Openers, not by fake Areas

Only an Area in `footer` used to open a Page, so a Page about a subject rather
than a place -- `page:clima`, `page:sicurezza` -- could only be reached by
registering an Area that is not a room. ADR-0005's own worked example did
exactly that (`area clima`). A Topic Page is now reached two ways: its front
door is a **Page Opener**, an `input_button` whose object id names the Page
(`input_button.sicurezza` opens `page:sicurezza`), rendered as the same block an
Area gets in `footer`; and its members lead to it by a Derived rule -- an
entity in `footer` gets a chevron to the other Page where it is Placed in
`left` or `right`, and in `glance` the temperature and consumption open theirs
on a tap. The chevron is the Row's
([ADR-0010](0010-rows-drop-the-long-press-modal.md)) and the Page choice is the
camera glance's (#29), so no new kind of navigation is added.

## Considered options

- **Fake Areas.** No code change, but every one also appears in Home
  Assistant's own UI, its voice assistants and its Area pickers, and it
  contradicts CONTEXT.md's Area: "a room or zone of a house".
- **Members only.** An entity's chevron leads to the Topic Page, and nothing
  else does. Rejected because nothing on the panel then says "Sicurezza": the
  only door to the security Page would be a block that is the alarm.
- **A member dressed as the Page.** The entity's footer block titled with the
  Page it leads to. Rejected because an entity's shape would then depend on
  labels elsewhere, where the Region alone is meant to decide it.

## Consequences

- An `input_button` that does nothing when pressed is deliberate. It is
  stateless and harmless in Home Assistant's own UI, which is why it was
  chosen over a `script` or `input_boolean`, both of which do something.
- A mistyped object id opens an empty Page, which says so. That is louder
  than a mistyped Placement Label, which renders nothing.
- `area clima` in ADR-0005's worked example and `docs/protocol.md` is
  superseded by `input_button.clima`.
