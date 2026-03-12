Roadmap for show-graphics_AD development
_______________________________
OK, here are some thoughts for major improvenments of the tool.

Please read, think, comment and make suggestions for the roadmap.

Let´s advance this tool to the next level.



Ideas:

To make it a way more flexible tool, please add a second live layer to show QR codes/ Bugs on one layer and all other graphics on a second layer.

This way, the operator could show a bug/ QR code at one moment and add a graphic, the show is talking about in the next moment.

OK, some major engine changes:
I want this tool to essentially spit out 4 output URLs.
2x for Graphics (H/V) and 2x for bugs (H/V) .
This way, the vMix operator can create separate browser inputs for bugs and graphics.

Local Layer 0: Backgrounds
Live Layer 1: Bugs
Live Layer 2: Graphics

Then send Graphics layer output to one URL per H/V and Bugs layer output to another URL per H/V.
Make the SLOT section showing both layers (and the BG References for setup) and a toggle to switch each layer on/ off in the SLOT Preview, but consistent in the outputs.
Means, we are always sending "transparent" to all URL outputs.

Add some "send Graphics H live/ send Graphics V live" and "send Bugs H live/ send Bugs V live" buttons.

Essentially treat the Slot windows as pure preview windows.
Only when "Send LIVE" is active, the content  get sent to the Output URLs


-fix move issue (sometimes when dragging/ moving a graphic in slot, it jumps unintended. We had this issue before and it got better, after you fixed s.th., but still occurs occasionally)

Please create ona separate categorie for QR codes and one for all other assets.



Rename the category management to tag management


-Make a Selector for different output resolutions (with pesets for standard resolutions like 4k,1440,1080) independent for  H and V format.
and an input field for custom resolution (e.g. 12000x2000p...)
Nobody will have a e.g. 2000x12000p, so it would be necessary to set the resolutions per format.
I think setting the resolution is key, to have a proper representation of true position, right?
Adjust the SLOT window proportions accordingly, if possible

-maybe create a "settings" window/ popup, to set project specifics like resolution and other things, if the main screen gets too cluttered.

Place the Background references category direcly above the Images library.
call it background reference library

Can you place the "category management" categoryx somewhere else, where it won´t consume too much screen realestate, even when collapsed?

create

-make the background knock-out tool for the inputs way more sophisticated, to achieve the best possible outcome with the free tool.

-make Image library assets "unchangable" in the way that whenever changes get applied (like knock... ), auto safe as copy to avoid, that Library assets get "messed up" unintentionally
-make the image library searchable with auto suggest when typing.

-images "edit" section: (I´ll call it Editor)
Make the name/ tilte editable in this window as well, if it´s possible.
apply a grid as well to the "edit" section of assets.
also with intensity and on/off switch
-Change the "apply crop" button, so it doesn´t override the "Trim sides" adjustments.
-There is an inconsistency with the cropping and trimming.
When cropping, you have to apply cropping to right "preview" side of the edited image.
When Trimming, you see changes immediately on the right side under background knock-out.
So let´s change the "Editor interface" as follows:
I´ll call the left side "image crop" section and the right side "Preview" section (the one on the right side under background knock-out.)
-Treat the right side as a real preview window, reflecting all changes.
not only as the knock-out window, also kind o reflecting the changes of the crop section.
So, all changes applied to crop or trim, will be shown in the preview section immediately.
-Treat Crop and Trim as living side by side, not "additive", like now.
Means: I can use Trim sliders or crop handles, to change the image.
Setting the one, will be reflected on the other one. No adding of trim and crop!
-Make the crop handles a bit bigger/ better visible.
-Make "reset crop/ trim one button, because crop and trimessentially  does the same now. This reste will reset crop and preview window.
-Make the Editor window in general bigger, covering around 2/3 of my screen, not only like 1/3.
That makes the visual preview better for operator by increasing the size of crop and preview window as well.
-Make the previwe window be 16:9 concise and only change the image properties inside the 16:9 canvas like on the crop side.
-Leave the "pick color/ tolerance/ KO section" in the same position relative to new format.
Add a rotation tool for the assets to have them be rotatable freely.
Space would be under the Preview window of the editor.
-Make the "save as new image" way bigger and add the possibility to name it befor saving.
-Prepopulate current name faintly, and select it to be overritten immediately.

-Preview tiles of images:
make the names scale better to be able to see the whole text (maybe expand when hovering over it of suggest a betetr way)
Make the "tag icon/ folder" a bitt bigger and better spaced to the "setH" button underneath
Make the pop up window Preview windows ca. 30% bigger and call it Preview across all tiles/ images and categories.

-

Saved Layouts section:
Give the saved Layouts also the ability to open the editor by klicking the stylus. Not only renaming- if possible.

Slot section:
-make the slot windows show "every pixel of the canvas", no rounded corners and no "hidden/ disclosed" pixels to have a really true preview of the output
Make the BG Ref and Grid buttons better visible



In other words, make the tool completely consistent over all sections...



Is it possible to export assets from the interface to local disk or so?


-What possibilities do you see, to make this tool enable hosting and playing videos as well?
-How about the audio Part of that equation?


-Add a hint, that Images should be named properly before uploading, because Names are persistent (they are, correct? You can´t make it possible to change the Image library names afterwards?)

-Can you make it possible to rename any images and layouts of the other sections?

one note from my fried, who helps me developing this:
Let's add an "Event" that will allow us to group graphics and galleries related to various events being produced under the user's AppKey. It would keep one event's image groupings isolated from others. The Event can be provided in the QueryString of the URL so that, if no Event is selected in the Galley page, or is found in the QueryString, the current gallery displayed and user would be the "default" image group for that AppKey, so the user will always have a place to start. Events can be added and selected via drop-down at the top of the page. When selected, the gallery would refresh, and the display pages designated to serve the "selected image" for horizontal and vertical formats would also include the Event in the QueryString.


Name the v2 of the tool "adp-show-graphics"

I created the corresponding folder with roadmap file in Ponyhof

Please suggest the repository structure.

---

## Credits feature (note from collaborator)

"Credits should not scroll... paged is better. Fade in is nice, image support on at least one page is important for the Zoom branding that I think we've agreed to use. We could pull names from the signup sheet for most... Contributors we'd need to get from Mukana, but we could leverage my Panel Liason tools to post contributors and Tlaloc Traversal to an endpoint that you provide"

→ Implementation thoughts:
- Credits as a separate output page (credits-h.html / credits-v.html) or as a layer within the existing layer system
- Paged display with fade-in transitions between pages (not continuous scroll)
- At least one page supports a full background image (Zoom branding)
- Name data source: pull from signup sheet (API endpoint to be defined)
- Contributor data: posted via Panel Liaison tools + Tlaloc Traversal → Worker endpoint (e.g. PUT /credits?event=X)
- Worker stores credit pages in KV; credits output page polls and renders


Add a rotation slider to the SLOTs as well


Make the preview buttons toggles, to have everything or also nothing in preview, like desired
Make the Send Live buttons go red when live and green, when not live


---

## v2 Development Plan (adp-show-graphics)

### SESSION 3 — Gallery UI overhaul — COMPLETE ✅ (commit af35dd8)

**Functional bugs to fix:**
- Scale & rotate sliders don't persist → debounced `pushSelectCtrl` needed in `onScaleInput`/`onRotateInput`
- BG Reference Library collapse button does nothing → fix `toggleSection` binding
- Drag jump issue (occasional position jump during drag) → guard against mid-drag polling overwrite

**Slots panel layout:**
- H and V canvases: same fixed pixel height (V shows content smaller — correct)
- URL bars → move ABOVE the canvas, buttons labeled "Open" / "Copy"
- Remove Fill fit button (only Contain / Cover)
- GFX/Bug tab labels → "Manipulate GFX" / "Manipulate Bug"
- Grid selector format → "40×40" not "40×"
- Monitor magnify → 70% screen (was 60%)

**Center panel — 13 buttons + clears + target:**
- Group 1 (Preview toggles, 4 buttons): Bug H Preview | Bug V Preview | GFX H Preview | GFX V Preview
- Group 2 (LIVE, 9 buttons): Bug H-LIVE | Bug V-LIVE → GFX H-LIVE | GFX V-LIVE → Credits H-LIVE | Credits V-LIVE → BUG H/V-LIVE | GFX H/V-LIVE | Credits H/V-LIVE
- Clear group (4 buttons): GFX H ✕ | GFX V ✕ | Bug H ✕ | Bug V ✕
- Target selector (Send image to →): GFX H | GFX V | Bug H | Bug V

**Output sidebar — 3 labeled groups:**
- QR / Bugs OUTPUT: Bug H monitor + Bug V monitor (each clickable → magnify 70%)
- Graphics OUTPUT: GFX H monitor + GFX V monitor
- Credits OUTPUT: Credits H + Credits V (stub) — note: "Click Credits windows to edit Credits"

**Section order (top→bottom below Slots):**
1. Saved Layouts
2. Processed Images (add — images tagged `edited`)
3. Category Management (= Tag Management)
4. Image Library
5. BG Reference Library (moved out of Slots section)
6. Credits Library (add — images tagged `Credits`)
- Chevron LEFT of section title (not far right)
- Default: all sections expanded
- Upload / Add / Select buttons → LEFT side of toolbar rows

**Upload modal improvements:**
- Single upload window for all categories
- Checkbox selectors to choose target library/libraries (Image Library, BG Reference, Credits Library, Processed Images)
- File browser button in addition to drag & drop (native file picker)
- Auto-suggest category based on filename rules (existing feature, keep)

**Tag Management improvements:**
- Rename tag: inline or prompt → immediately renames tag on all images (via Worker)
- Delete tag: confirmation → removes tag from all images
- Changes reflected immediately in filter bar, card chips, and upload chips

**Image preview modal:**
- H (16:9) preview LEFT + V (9:16) preview RIGHT, side-by-side
- 4 slot buttons: GFX H / GFX V / Bug H / Bug V (replaces single "Send to slot")
- Image card thumbnail background → lighter grey (#2d2d2d)

**Page zoom / font scale:**
- Increase base font-size so 100% browser zoom = previous 125% zoom appearance
- Page should scale smoothly at any zoom level

---

### SESSION 4 — UI refinements — COMPLETE ✅ (last commit: 96e33ad)

**Done:**
- Center panel buttons larger (pvtgl + lvbtn), ctr-group cards, snap-to-grid checkboxes
- Removed "Send image to" block (per-card slot buttons replace it)
- Live Slots section non-collapsible
- Canvas H = exact 16:9 (640×360px), V = exact 9:16 (202×360px), border-radius:0
- Sidebar: brighter bg (surf3), monitors H+V side-by-side per group

---

### SESSION 5 — Manipulation mode + tiles + editor stub + scaling fix — COMPLETE ✅ (last commit: bcd26dc)

**Done:**
- **48fb44d** — Step 5: Manipulation mode toggle — Manip. GFX (red glow) / Manip. BUG (blue glow); clicking active mode deactivates; sliders/fit buttons disabled (opacity:.35, pointer-events:none) when no mode active; null guards in input handlers
- **c51b387** — Step 6: Image tile thumbnails 110px→143px (+30%); ✏️ now opens editor modal stub instead of inline rename; editor modal shell: 72vw two-column layout (left: crop/trim/KO/rotation stubs; right: 16:9 preview canvas); name field pre-populated + auto-selected; Save as Copy footer (disabled until Step 7)
- **bcd26dc** — Slots section scaling fix: --canvas-h 360px→clamp(240px,28vh,500px); sidebar fixed width calc(canvas-h×1.2) instead of flex:1; sec-body centers block + overflow-x:auto for scroll fallback; portrait monitors width:38% height:auto

---

### SESSION 6 — Full Editor modal (NEXT)

**Step 7 — Editor modal (full implementation):**
- Left side: unified crop/trim (handles + sliders control the same thing, not additive), BG color knock-out (color picker + tolerance), rotation slider
- Right side: 16:9 constrained live preview, updates in real time
- Reset button resets crop/trim + preview together; crop handles larger/better visible
- Save as Copy: canvas export → POST /upload tagged `edited`, name editable before saving; never overwrites original

**Layout review (pending user feedback after bcd26dc):**
- Proportions may need further tuning after seeing live result

**Later — Credits output pages:**
- credits-h.html / credits-v.html
- Paged display with fade-in transitions (not scrolling)
- At least one page supports full background image (Zoom branding)
- Worker endpoint: PUT /credits?event=X → stored in KV → polled by output pages
- Gallery: Credits H/V/H+V LIVE buttons (activate center panel stubs)

**Future / backlog:**
- Export asset to local disk from gallery
- Sort/filter controls for image library (name, date, active-in-slot)
- Bitfocus Companion webhook support
- Video playback support
- remove.bg API integration for background knock-out (optional upgrade)

---

### OPEN QUESTIONS (to confirm before Session 3 implementation)

1. **Editor save behaviour**: Save as new edited copy OR overwrite in place? (Recommendation: always new copy, never overwrite — consistent with "library assets are protected" principle)
2. **Top toolbar annotation in mock-up** ("Place adjusted top bar in this section. Including the settings button.") — move Settings/Help/Event selector into the Live Slots section header bar?
3. **Rotate slider position**: URL bars move above canvas. Rotate slider stays below canvas (with Scale/Fit). Correct?


