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
