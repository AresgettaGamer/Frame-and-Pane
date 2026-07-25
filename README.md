# Frame & Pane

**Frame & Pane** is a Minecraft Bedrock add-on that adds functional, openable window frames made from 57 building materials. Every frame can hold a removable clear or colored glass panel without requiring a separate block for every glass color.

## Features

- 228 functional window-frame blocks.
- 57 frame materials.
- Four layouts per material:
  - Horizontal window.
  - Horizontal four-pane window.
  - Vertical window.
  - Vertical four-pane window.
- Openable paired horizontal windows and synchronized vertical columns.
- Automatic hinges, handles, and vertical frame connections.
- Insertable clear glass and all 16 stained-glass colors.
- Replaceable and removable panels that return the previous pane in Survival.
- Stonecutter recipe for every frame.
- English (`en_US`) and Mexican Spanish (`es_MX`) localization.
- Behavior Pack and Resource Pack distributed together as one `.mcaddon`.

## Requirements

- Minecraft Bedrock Edition **1.26.30 or newer**.
- The included Behavior Pack and Resource Pack must both be active.

No other add-on is required.

## Installation

1. Download `Frame_and_Pane_v1.0.0.mcaddon` from the Releases page.
2. Open the file with Minecraft Bedrock Edition.
3. Add both **Frame & Pane BP** and **Frame & Pane RP** to the world.
4. Place a supported material in a stonecutter to craft its four window variants.

## Usage

- Interact with a window using an empty hand to open or close it.
- Use a glass pane or stained-glass pane on a frame to install that panel.
- Use another pane to replace the current color; the old pane is returned in Survival.
- Sneak and interact with an empty hand to remove the installed panel.
- Breaking a framed window also drops its installed panel.

## Technical notes

The frame itself is a custom block. Installed glass is rendered by a lightweight internal visual entity with no AI, collision, gravity, or damage. The block stores whether a panel is present while the entity stores its color and visual layout.

Commands that indiscriminately remove every entity, such as `/kill @e`, also remove these internal visual entities. This is expected behavior for the current architecture.

## Building from source

Python 3.10 or newer is recommended.

```bash
python tools/build.py
```

The generated packages are written to `build/`:

- `Frame_and_Pane_BP_v1.0.0.mcpack`
- `Frame_and_Pane_RP_v1.0.0.mcpack`
- `Frame_and_Pane_v1.0.0.mcaddon`

To validate the source without building:

```bash
python tools/validate.py
```

## Repository layout

```text
behavior_pack/   Behavior Pack source
resource_pack/   Resource Pack source
tools/           Validation and packaging scripts
docs/            Publishing notes and images
dist/            Official v1.0.0 release archive
```

## Credits

Frame & Pane was created by **AresgettaYT**.

The project was inspired by the window concept of [Aesthetic Windows](https://github.com/Alminoris/AestheticWindows), created by Alminoris and published under CC0 1.0 Universal. Frame & Pane is an independent Minecraft Bedrock implementation with its own identifiers, scripts, recipes, interaction system, geometry handling, translations, and universal insertable-panel architecture.

## License

Frame & Pane is licensed under the [MIT License](LICENSE).

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for third-party acknowledgements.
