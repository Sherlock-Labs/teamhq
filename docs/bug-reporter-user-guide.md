# Bug Reporter -- User Guide

**What it is:** A floating widget on every TeamHQ page that lets you file a bug report in under 10 seconds. It captures a screenshot, records your voice with live transcription, and creates a bug work item automatically.

**Where it appears:** Every TeamHQ page except the hub (index.html). Look for the small dark circle with a bug icon in the bottom-right corner of the screen.

---

## Quick Start

1. **Open the reporter.** Click the bug button in the bottom-right corner, or press `Cmd+Shift+B` (Mac) / `Ctrl+Shift+B` (Windows/Linux).
2. **Speak your bug.** Click "Record voice note" and describe what happened. Words appear in the text box as you talk.
3. **Review and submit.** Edit the transcription if needed, then click "File bug."
4. **Done.** A "Bug filed!" toast confirms your report was saved.

That is the full flow. The rest of this guide covers each step in detail, along with tips and troubleshooting.

---

## Opening the Bug Reporter

There are two ways to open the panel:

- **Click the bug button** -- the dark circle in the bottom-right corner of any page.
- **Keyboard shortcut** -- `Cmd+Shift+B` on Mac, `Ctrl+Shift+B` on Windows/Linux.

When the panel opens, two things happen automatically:

1. A screenshot of the current page is captured. You will see a shimmer animation in the screenshot area while it loads (usually under half a second).
2. The bug button rotates and changes to an X icon, which you can click to close the panel.

**Note on the keyboard shortcut:** `Ctrl+Shift+B` is also the Chrome bookmarks shortcut on Windows. If that conflicts, use the button instead.

### Closing the Panel

- Click the X button (the same floating button in the corner).
- Press `Escape`.
- Use the keyboard shortcut again (`Cmd+Shift+B` / `Ctrl+Shift+B`).

Clicking outside the panel does **not** close it. This is intentional -- it prevents accidentally closing the reporter while you are in the middle of recording.

---

## Screenshot

A screenshot of the page is captured automatically when the panel opens. The screenshot shows exactly what was visible in your browser viewport at that moment. The panel itself is hidden during capture so it does not appear in the image.

### Previewing the Screenshot

- The thumbnail in the panel shows a small preview.
- Click the thumbnail (or press Enter when it is focused) to open a full-size preview overlay.
- Close the preview by clicking the backdrop, pressing Escape, or tabbing to the "Close preview" button.

### Retaking the Screenshot

If the screenshot does not capture the right state (for example, you need to scroll to a different part of the page first), click "Retake" below the thumbnail. The panel will re-capture the current viewport.

### If the Screenshot Fails

If the screenshot capture fails for any reason, you will see "Screenshot unavailable" with a "Retry" button. This does not block bug filing -- you can still record a voice note or type a description and submit without a screenshot.

---

## Recording a Voice Note

This is the fastest way to describe a bug. Click "Record voice note" and speak naturally. The widget uses your browser's microphone and sends audio to ElevenLabs for live transcription.

### What Happens When You Record

1. Your browser asks for microphone permission (first time only). Grant it to proceed.
2. A red recording indicator appears with a timer counting up and animated waveform bars.
3. **Words appear in the description text box as you speak**, in real time. There is no waiting for transcription after you stop -- the text is already there.
4. Click the red stop button (or wait for the 30-second limit) to end the recording.

### Recording Limits

- **Maximum duration:** 30 seconds. The timer turns orange at 25 seconds as a warning. At 30 seconds, recording stops automatically.
- **One recording at a time.** If you want to start over, click "Re-record" below the text box after stopping. This clears the current transcription and lets you record again.

### Editing the Transcription

After recording, the transcribed text appears in the description field. You can:

- Edit any part of the text (fix AI transcription mistakes, add details).
- Delete the text entirely and type your own description.
- Add text before, after, or in the middle of the transcription.

The text box is always editable, even during recording.

---

## Typing a Description Manually

You do not have to use voice recording. You can type directly into the description text box at any time:

- Skip the recording step entirely and just type.
- If your browser does not support audio recording, the recording section is hidden automatically and the text box becomes the primary input.
- If microphone permission is denied, a message explains how to fix it, and you can type your description instead.

---

## Submitting the Bug

Click "File bug" to submit. The button changes to "Filing..." with a spinner while the report is being saved.

### What Gets Submitted

Your bug report is saved as a work item with the following details:

| Field | Value |
|-------|-------|
| Type | "bug" |
| Title | Auto-generated from the first ~60 characters of your description, or "Bug on [page name]" if you submitted without a description |
| Description | The full text from the description field |
| Status | "planned" |
| Priority | "medium" |
| Screenshot | Saved as a PNG file on the server |
| Page URL | The URL of the page where you opened the reporter |
| Timestamp | When the bug was filed |

All bugs are filed to the "Bugs" project.

### What Counts as a Valid Bug Report

You need at least one of the following:

- A description (typed or transcribed)
- A screenshot

A screenshot with no description is valid. A description with no screenshot is also valid. The "File bug" button stays disabled until you have at least one.

The button is also disabled while a recording is in progress -- stop the recording first, then submit.

### After Submission

- The panel closes.
- A dark "Bug filed!" toast appears briefly in the bottom-right corner (3 seconds, then auto-dismisses).
- The bug is now visible in the work items for the Bugs project.

### If Submission Fails

An error message appears above the submit button: "Failed to file bug. Try again." Your description and screenshot are preserved -- nothing is lost. Click "File bug" again to retry.

If submission takes longer than 10 seconds, the button text changes to "Still submitting..." as a progress indicator. If it exceeds 20 seconds, the error state is shown automatically.

---

## Keyboard Navigation

The widget is fully keyboard-accessible.

| Key | Action |
|-----|--------|
| `Cmd/Ctrl + Shift + B` | Open or close the panel |
| `Escape` | Close the screenshot preview (if open), or close the panel |
| `Tab` | Move forward through the panel controls |
| `Shift + Tab` | Move backward through the panel controls |
| `Enter` or `Space` | Activate the focused button or open the screenshot preview |

When the panel opens, focus moves to the record button (or the text box if audio recording is not available). When the panel closes, focus returns to the bug button.

During recording, focus moves to the stop button. After recording stops, focus moves to the description text box so you can review and edit the transcription.

---

## Pages Where the Widget Appears

The bug reporter is available on these pages:

- Projects
- Tools
- Meetings
- Interviews
- Docs
- Spreadsheets
- Team
- Tasks

It is **not** on the index.html hub page.

The panel header shows which page you are on (for example, "Report a bug -- on Projects") so you can confirm the context of your report.

---

## Troubleshooting

### "Microphone access denied"

Your browser blocked microphone access. To fix this:

- **Chrome:** Click the lock/tune icon in the address bar, find "Microphone," and set it to "Allow." Reload the page.
- **Firefox:** Click the lock icon in the address bar, then "Clear This Permission" next to Microphone. Re-open the reporter and allow when prompted.
- **Safari:** Go to Safari > Settings > Websites > Microphone and allow the site.

You can always type your description manually if you prefer not to grant microphone access.

### Words are not appearing during recording

If the live transcription connection fails (network issue or service unavailable), the recording still works -- you just will not see words appear in real time. After stopping the recording, type your description manually.

### Screenshot looks wrong

The screenshot uses html2canvas, which renders the page's DOM to a canvas image. Some CSS features like backdrop-filter or complex SVGs may not render perfectly. This is expected -- the screenshot provides visual context, not a pixel-perfect reproduction.

If the screenshot captures the wrong area, close the panel, scroll or navigate to the right spot, and re-open it. You can also click "Retake" after opening.

### The keyboard shortcut does not work

On Windows, `Ctrl+Shift+B` may be intercepted by Chrome to open bookmarks. Use the bug button directly instead, or try a different browser.

### The submit button is grayed out

The submit button is disabled when:

1. A recording is in progress (stop the recording first).
2. There is no content at all (no description text and no screenshot).

Add a description or ensure the screenshot captured successfully, then try again.

---

## Known Limitations (v1)

These are not bugs -- they are features intentionally deferred to a future version:

- **No annotation tools.** You cannot draw on or highlight parts of the screenshot.
- **No project selection.** All bugs go to the "Bugs" project. You cannot choose a different project from the widget.
- **Desktop-focused.** The widget works on small screens but is optimized for desktop use.
- **No duplicate detection.** The widget does not check if a similar bug has already been filed.
- **No notifications.** Filing a bug does not send a Slack message or email. Check the Bugs project work items to see filed reports.
- **Local screenshot storage.** Screenshots are stored on the server filesystem, not in cloud storage.
