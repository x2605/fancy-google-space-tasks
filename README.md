# Fancy Google Space Tasks

## Introduction

This is a Chrome Extension project designed to improve the user experience within Google Workspace. It specifically targets the Original UI of the embedded Tasks pages (`tasks.google.com/embed/`) that appear in the Tasks menu and Tasks sidebar of Space chat rooms on `mail.google.com` and `chat.google.com`. The extension achieves this by introducing a Custom UI to enhance functionality and appearance.

The extension is currently under review by the Chrome Web Store and is only available for testing. For early access, please download the master source code, enable developer mode in your browser's extension settings, and load the source code folder directly.

## Features

- **Hierarchical Task Categorization:** If you use square brackets `[]` as prefixes in task titles, like `[A][B][C]D` (without spaces), the extension will interpret `[A]` as the top-level category, `[B]` as a sub-category of `[A]`, and `[C]` as a sub-category of `[A][B]`. These will be displayed in separate cells within the Custom UI, with `D` remaining as the main task title. This allows for leveraging these special patterns as metadata.

- **UI Toggle:** Provides a toggle function to switch between the Original UI and the Custom UI.

- **Per-Chat Room State Persistence:** Uses extension storage to remember the UI toggle state and the completed tasks visibility state for each individual chat room.

- **Current Functionality:** Currently, only "toggle completion state," "view at chat," and "delete task" functionalities are active.

## How to Build

To prepare the extension for use or distribution, ensure you have **Node.js** installed, then follow these steps:

1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Build the extension:**
    ```bash
    npm run build
    ```
    This command will generate the `dist` folder, which contains the necessary files to be loaded as a Chrome Extension.

## Planned Features

The extension is still in its early stages; some buttons are not yet functional, and the Custom UI is not fully polished.

### Reflecting Original Functionality

- We plan to reflect the original functionality for editing tasks: clicking on a date or assignee in either UI will bring up a unified modal to allow detailed editing of all aspects of a single task.

- The ability to add new tasks at a desired position, mirroring the Original UI functionality, will be implemented.

- The ability to change the custom position of tasks, mirroring the Original UI functionality, will be implemented.

### Additional Custom Features

- **Horizontal Time Schedule Graph:** A horizontally scrollable time schedule graph will be added to the Custom UI, displayed on a weekly basis (where the first Monday of a month is treated as the start of Week 1 for that month).

- **Financial Metadata Parsing:** Rules will be created for parsing financial metadata (e.g., income/expenses). This will allow a portion of the title space to be used for sums and a portion of the description space for cost changes within the Custom UI.

- **Secondary Date/Time Metadata:** The ability to parse a second date and time as metadata will be added, allowing it to be displayed as supplementary information, such as a start or end date, in the Custom UI.

- **Custom Metadata Parsing:** Users will be able to create their own custom metadata parsing rules.

- **Edge Extension Port:** Once deployed on the Chrome Web Store, there are plans to port the extension to Edge.

## Privacy

- Check [PRIVACY.md](https://github.com/x2605/fancy-google-space-tasks/blob/main/PRIVACY.md) file in the repository.

## External Open Source Libraries

- [linkifyjs v4.3.2](https://github.com/nfrasser/linkifyjs/releases/tag/v4.3.2)

- [color-thief v2.6.0](https://github.com/lokesh/color-thief/releases/tag/v2.6.0)

## Why Was This Created?

I started this project because my boss repeatedly asks me to organize tasks manually in Excel, which I find anachronistic and inefficient. He also expressed significant dissatisfaction with the Original Tasks UI, finding it severely inconvenient.
