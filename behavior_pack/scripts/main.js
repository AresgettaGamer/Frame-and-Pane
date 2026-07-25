import { ItemStack, system } from "@minecraft/server";

const WINDOW_SUFFIXES = Object.freeze({
  verticalFourPane: "_vertical_fourpane_window",
  vertical: "_vertical_window",
  horizontalFourPane: "_fourpane_window",
  horizontal: "_window"
});

function windowKindFromTypeId(typeId) {
  if (
    typeof typeId !== "string" ||
    !typeId.startsWith("framepane:")
  ) {
    return undefined;
  }

  if (typeId.endsWith(WINDOW_SUFFIXES.verticalFourPane)) {
    return "vertical";
  }

  if (typeId.endsWith(WINDOW_SUFFIXES.vertical)) {
    return "vertical";
  }

  if (typeId.endsWith(WINDOW_SUFFIXES.horizontalFourPane)) {
    return "horizontal";
  }

  if (typeId.endsWith(WINDOW_SUFFIXES.horizontal)) {
    return "horizontal";
  }

  return undefined;
}

const OPEN_STATE = "framepane:open";
const VERTICAL_CONNECTION_STATE =
  "framepane:vertical_connection";
const HANDLE_POSITION_STATE =
  "framepane:handle_position";
const HINGE_STATE = "framepane:hinge";
const DIRECTION_STATE = "minecraft:cardinal_direction";
const HAS_PANEL_STATE = "framepane:has_panel";
const COMPONENT_ID = "framepane:window_controller";
const PANEL_ENTITY_TYPE = "framepane:panel_visual";
const PANEL_COLOR_PROPERTY = "framepane:panel_color";
const PANEL_VISUAL_PROPERTY = "framepane:panel_visual";
const MAX_RUN = 64;

const PANEL_ITEM_TO_STATE = new Map([
  ["minecraft:glass_pane", "clear"],
  ["minecraft:white_stained_glass_pane", "white"],
  ["minecraft:orange_stained_glass_pane", "orange"],
  ["minecraft:magenta_stained_glass_pane", "magenta"],
  ["minecraft:light_blue_stained_glass_pane", "light_blue"],
  ["minecraft:yellow_stained_glass_pane", "yellow"],
  ["minecraft:lime_stained_glass_pane", "lime"],
  ["minecraft:pink_stained_glass_pane", "pink"],
  ["minecraft:gray_stained_glass_pane", "gray"],
  ["minecraft:light_gray_stained_glass_pane", "light_gray"],
  ["minecraft:cyan_stained_glass_pane", "cyan"],
  ["minecraft:purple_stained_glass_pane", "purple"],
  ["minecraft:blue_stained_glass_pane", "blue"],
  ["minecraft:brown_stained_glass_pane", "brown"],
  ["minecraft:green_stained_glass_pane", "green"],
  ["minecraft:red_stained_glass_pane", "red"],
  ["minecraft:black_stained_glass_pane", "black"],
]);

const PANEL_STATE_TO_ITEM = new Map([
  ["clear", "minecraft:glass_pane"],
  ["white", "minecraft:white_stained_glass_pane"],
  ["orange", "minecraft:orange_stained_glass_pane"],
  ["magenta", "minecraft:magenta_stained_glass_pane"],
  ["light_blue", "minecraft:light_blue_stained_glass_pane"],
  ["yellow", "minecraft:yellow_stained_glass_pane"],
  ["lime", "minecraft:lime_stained_glass_pane"],
  ["pink", "minecraft:pink_stained_glass_pane"],
  ["gray", "minecraft:gray_stained_glass_pane"],
  ["light_gray", "minecraft:light_gray_stained_glass_pane"],
  ["cyan", "minecraft:cyan_stained_glass_pane"],
  ["purple", "minecraft:purple_stained_glass_pane"],
  ["blue", "minecraft:blue_stained_glass_pane"],
  ["brown", "minecraft:brown_stained_glass_pane"],
  ["green", "minecraft:green_stained_glass_pane"],
  ["red", "minecraft:red_stained_glass_pane"],
  ["black", "minecraft:black_stained_glass_pane"],
]);

const PANEL_STATE_TO_COLOR = new Map([
  ["clear", 0],
  ["white", 1],
  ["orange", 2],
  ["magenta", 3],
  ["light_blue", 4],
  ["yellow", 5],
  ["lime", 6],
  ["pink", 7],
  ["gray", 8],
  ["light_gray", 9],
  ["cyan", 10],
  ["purple", 11],
  ["blue", 12],
  ["brown", 13],
  ["green", 14],
  ["red", 15],
  ["black", 16],
]);

const PANEL_COLOR_TO_STATE = new Map(
  [...PANEL_STATE_TO_COLOR.entries()].map(
    ([state, color]) => [color, state]
  )
);

const DIRECTION_TO_YAW = Object.freeze({
  north: 180,
  east: -90,
  south: 0,
  west: 90
});

const SIDE_VECTORS = Object.freeze({
  north: Object.freeze({
    left: Object.freeze({ x: 1, y: 0, z: 0 }),
    right: Object.freeze({ x: -1, y: 0, z: 0 })
  }),
  south: Object.freeze({
    left: Object.freeze({ x: -1, y: 0, z: 0 }),
    right: Object.freeze({ x: 1, y: 0, z: 0 })
  }),
  east: Object.freeze({
    left: Object.freeze({ x: 0, y: 0, z: -1 }),
    right: Object.freeze({ x: 0, y: 0, z: 1 })
  }),
  west: Object.freeze({
    left: Object.freeze({ x: 0, y: 0, z: 1 }),
    right: Object.freeze({ x: 0, y: 0, z: -1 })
  })
});

const UP = Object.freeze({ x: 0, y: 1, z: 0 });
const DOWN = Object.freeze({ x: 0, y: -1, z: 0 });

function offset(location, vector) {
  return {
    x: location.x + vector.x,
    y: location.y + vector.y,
    z: location.z + vector.z
  };
}

function sameLocation(left, right) {
  return left.x === right.x &&
    left.y === right.y &&
    left.z === right.z;
}

function isWindow(block) {
  return Boolean(block && windowKindFromTypeId(block.typeId));
}

function isHorizontal(block) {
  return Boolean(
    block && windowKindFromTypeId(block.typeId) === "horizontal"
  );
}

function isVertical(block) {
  return Boolean(
    block && windowKindFromTypeId(block.typeId) === "vertical"
  );
}

function hasEmptyMainHand(player) {
  try {
    const inventory =
      player.getComponent("minecraft:inventory")?.container;

    if (!inventory) return true;

    return inventory.getItem(
      player.selectedSlotIndex
    ) === undefined;
  } catch {
    return true;
  }
}

function mainHand(player) {
  try {
    const container =
      player.getComponent("minecraft:inventory")?.container;

    if (!container) {
      return { container: undefined, item: undefined };
    }

    return {
      container,
      item: container.getItem(player.selectedSlotIndex)
    };
  } catch {
    return { container: undefined, item: undefined };
  }
}

function isCreative(player) {
  try {
    return String(player.getGameMode()).toLowerCase() ===
      "creative";
  } catch {
    return false;
  }
}

function blockCentre(block) {
  return {
    x: block.location.x + 0.5,
    y: block.location.y + 0.5,
    z: block.location.z + 0.5
  };
}

function panelEntityLocationFromBlockLocation(location) {
  return {
    x: location.x + 0.5,
    y: location.y,
    z: location.z + 0.5
  };
}

function panelEntityLocation(block) {
  return panelEntityLocationFromBlockLocation(block.location);
}

function panelEntitiesAtLocation(dimension, blockLocation) {
  const centre = panelEntityLocationFromBlockLocation(
    blockLocation
  );

  try {
    return dimension.getEntities({
      type: PANEL_ENTITY_TYPE,
      location: centre,
      maxDistance: 0.2
    }).filter(entity =>
      Math.abs(entity.location.x - centre.x) < 0.05 &&
      Math.abs(entity.location.y - centre.y) < 0.05 &&
      Math.abs(entity.location.z - centre.z) < 0.05
    );
  } catch {
    return [];
  }
}

function panelEntitiesAt(block) {
  return panelEntitiesAtLocation(
    block.dimension,
    block.location
  );
}

function removePanelEntitiesAt(dimension, location) {
  for (const entity of panelEntitiesAtLocation(
    dimension,
    location
  )) {
    try {
      entity.remove();
    } catch {}
  }
}

function removePanelEntities(block) {
  removePanelEntitiesAt(
    block.dimension,
    block.location
  );
}

function panelStateFromEntity(entity) {
  try {
    const color = entity.getProperty(
      PANEL_COLOR_PROPERTY
    );

    return typeof color === "number"
      ? PANEL_COLOR_TO_STATE.get(color)
      : undefined;
  } catch {
    return undefined;
  }
}

function hasPanel(blockOrPermutation) {
  try {
    return blockOrPermutation.getState(
      HAS_PANEL_STATE
    ) === true;
  } catch {
    try {
      return blockOrPermutation.permutation.getState(
        HAS_PANEL_STATE
      ) === true;
    } catch {
      return false;
    }
  }
}

function setPanelPresence(block, present) {
  try {
    block.setPermutation(
      block.permutation.withState(
        HAS_PANEL_STATE,
        present
      )
    );
    return true;
  } catch (error) {
    console.warn(
      "[Frame & Pane] No se pudo cambiar la presencia " +
      `del panel: ${error}`
    );
    return false;
  }
}

function panelVisualIndex(block) {
  const opened =
    block.permutation.getState(OPEN_STATE) === true;
  const hinge =
    block.permutation.getState(HINGE_STATE) === "right"
      ? 1
      : 0;

  if (
    block.typeId.endsWith(
      WINDOW_SUFFIXES.verticalFourPane
    )
  ) {
    const connection = block.permutation.getState(
      VERTICAL_CONNECTION_STATE
    );
    const connectionIndex = {
      none: 0,
      up: 1,
      down: 2,
      both: 3
    }[connection] ?? 0;

    return 24 +
      connectionIndex * 4 +
      hinge * 2 +
      (opened ? 1 : 0);
  }

  if (
    block.typeId.endsWith(
      WINDOW_SUFFIXES.vertical
    )
  ) {
    const connection = block.permutation.getState(
      VERTICAL_CONNECTION_STATE
    );
    const connectionIndex = {
      none: 0,
      up: 1,
      down: 2,
      both: 3
    }[connection] ?? 0;

    return 8 +
      connectionIndex * 4 +
      hinge * 2 +
      (opened ? 1 : 0);
  }

  if (
    block.typeId.endsWith(
      WINDOW_SUFFIXES.horizontalFourPane
    )
  ) {
    return 4 + hinge * 2 + (opened ? 1 : 0);
  }

  return hinge * 2 + (opened ? 1 : 0);
}

function setPanelEntityVisual(entity, block, state) {
  const color = PANEL_STATE_TO_COLOR.get(state);

  if (color === undefined) return false;

  try {
    entity.setProperty(
      PANEL_COLOR_PROPERTY,
      color
    );
    entity.setProperty(
      PANEL_VISUAL_PROPERTY,
      panelVisualIndex(block)
    );
    entity.setRotation({
      x: 0,
      y: DIRECTION_TO_YAW[
        block.permutation.getState(DIRECTION_STATE)
      ] ?? 0
    });

    return true;
  } catch (error) {
    console.warn(
      "[Frame & Pane] No se pudo actualizar la entidad " +
      `visual del panel: ${error}`
    );
    return false;
  }
}

function primaryPanelEntity(block) {
  const entities = panelEntitiesAt(block);
  const primary = entities[0];

  for (let index = 1; index < entities.length; index++) {
    try {
      entities[index].remove();
    } catch {}
  }

  return primary;
}

function spawnPanelEntity(block, state) {
  try {
    const entity = block.dimension.spawnEntity(
      PANEL_ENTITY_TYPE,
      panelEntityLocation(block)
    );

    if (!setPanelEntityVisual(entity, block, state)) {
      try {
        entity.remove();
      } catch {}
      return undefined;
    }

    return entity;
  } catch (error) {
    console.warn(
      "[Frame & Pane] No se pudo crear la entidad visual " +
      `del panel: ${error}`
    );
    return undefined;
  }
}

function syncPanelVisual(block, fallbackState = "clear") {
  if (!isWindow(block)) return;

  if (!hasPanel(block)) {
    removePanelEntities(block);
    return;
  }

  let entity = primaryPanelEntity(block);

  if (!entity) {
    entity = spawnPanelEntity(block, fallbackState);
    return;
  }

  const state = panelStateFromEntity(entity) || fallbackState;
  setPanelEntityVisual(entity, block, state);
}

function giveOrDrop(player, itemId, dimension, location) {
  const stack = new ItemStack(itemId, 1);

  try {
    const container =
      player?.getComponent("minecraft:inventory")?.container;

    const remainder = container?.addItem(stack);

    if (remainder) {
      dimension.spawnItem(remainder, location);
    } else if (!container) {
      dimension.spawnItem(stack, location);
    }
  } catch {
    try {
      dimension.spawnItem(stack, location);
    } catch {}
  }
}

function consumeSelectedItem(player, container, item) {
  if (isCreative(player)) return true;
  if (!container || !item) return false;

  try {
    if (item.amount <= 1) {
      container.setItem(player.selectedSlotIndex);
    } else {
      item.amount -= 1;
      container.setItem(player.selectedSlotIndex, item);
    }

    return true;
  } catch {
    return false;
  }
}

function installedPanelState(block) {
  if (!hasPanel(block)) return "empty";

  const entity = primaryPanelEntity(block);
  return entity
    ? panelStateFromEntity(entity) || "clear"
    : "clear";
}

function installPanel(
  block,
  player,
  container,
  heldItem,
  state
) {
  const previous = installedPanelState(block);

  if (previous === state) return true;

  if (!setPanelPresence(block, true)) return false;

  let entity = primaryPanelEntity(block);

  if (!entity) {
    entity = spawnPanelEntity(block, state);
  } else {
    setPanelEntityVisual(entity, block, state);
  }

  if (!entity) {
    setPanelPresence(block, previous !== "empty");
    return false;
  }

  if (!consumeSelectedItem(player, container, heldItem)) {
    if (previous === "empty") {
      removePanelEntities(block);
      setPanelPresence(block, false);
    } else {
      setPanelEntityVisual(entity, block, previous);
    }

    return false;
  }

  const previousItem = PANEL_STATE_TO_ITEM.get(previous);

  if (previousItem && !isCreative(player)) {
    giveOrDrop(
      player,
      previousItem,
      block.dimension,
      blockCentre(block)
    );
  }

  return true;
}

function removePanel(block, player) {
  const previous = installedPanelState(block);
  const previousItem = PANEL_STATE_TO_ITEM.get(previous);

  if (!previousItem) return false;
  if (!setPanelPresence(block, false)) return false;

  removePanelEntities(block);

  if (!isCreative(player)) {
    giveOrDrop(
      player,
      previousItem,
      block.dimension,
      blockCentre(block)
    );
  }

  return true;
}

function dropBrokenPanel(dimension, location, permutation) {
  if (!hasPanel(permutation)) {
    removePanelEntitiesAt(dimension, location);
    return;
  }

  const entities = panelEntitiesAtLocation(
    dimension,
    location
  );
  const state = entities[0]
    ? panelStateFromEntity(entities[0]) || "clear"
    : "clear";
  const itemId = PANEL_STATE_TO_ITEM.get(state);

  removePanelEntitiesAt(dimension, location);

  if (!itemId) return;

  system.run(() => {
    try {
      dimension.spawnItem(
        new ItemStack(itemId, 1),
        {
          x: location.x + 0.5,
          y: location.y + 0.5,
          z: location.z + 0.5
        }
      );
    } catch (error) {
      console.warn(
        "[Frame & Pane] No se pudo soltar el panel: " +
        error
      );
    }
  });
}

function directionOf(blockOrPermutation) {
  try {
    return blockOrPermutation.getState(DIRECTION_STATE);
  } catch {
    try {
      return blockOrPermutation.permutation.getState(
        DIRECTION_STATE
      );
    } catch {
      return undefined;
    }
  }
}

function sideBlock(block, side) {
  const vector =
    SIDE_VECTORS[directionOf(block)]?.[side];

  return vector
    ? block.dimension.getBlock(
        offset(block.location, vector)
      )
    : undefined;
}

function compatibleHorizontal(block, direction, typeId) {
  return Boolean(
    isHorizontal(block) &&
    block.typeId === typeId &&
    directionOf(block) === direction
  );
}

function collectHorizontalRun(seed) {
  if (!isHorizontal(seed)) return [];

  const direction = directionOf(seed);
  const typeId = seed.typeId;

  if (!SIDE_VECTORS[direction]) return [seed];

  let first = seed;

  for (let step = 0; step < MAX_RUN; step++) {
    const previous = sideBlock(first, "left");

    if (
      !compatibleHorizontal(
        previous,
        direction,
        typeId
      )
    ) {
      break;
    }

    first = previous;
  }

  const run = [];
  let current = first;

  for (
    let step = 0;
    step < MAX_RUN &&
      compatibleHorizontal(current, direction, typeId);
    step++
  ) {
    run.push(current);

    const next = sideBlock(current, "right");

    if (
      !compatibleHorizontal(next, direction, typeId)
    ) {
      break;
    }

    current = next;
  }

  return run;
}


function horizontalHingeAt(index, length, direction) {
  if (
    length === 1 ||
    (length % 2 === 1 && index === length - 1)
  ) {
    return "right";
  }

  const mirrorPair =
    direction === "east" || direction === "west";

  if (index % 2 === 0) {
    return mirrorPair ? "right" : "left";
  }

  return mirrorPair ? "left" : "right";
}

function updateHorizontalRun(seed) {
  const run = collectHorizontalRun(seed);

  for (let index = 0; index < run.length; index++) {
    const block = run[index];

    try {

      const hinge = horizontalHingeAt(
        index,
        run.length,
        directionOf(block)
      );

      let permutation = block.permutation;

      if (
        permutation.getState(HINGE_STATE) !== hinge
      ) {
        permutation = permutation.withState(
          HINGE_STATE,
          hinge
        );
      }

      if (permutation !== block.permutation) {
        block.setPermutation(permutation);
      }

      syncPanelVisual(block);
    } catch (error) {
      console.warn(
        "[Frame & Pane] No se pudo actualizar " +
        `una fila horizontal: ${error}`
      );
    }
  }
}

function pairedHorizontalWindow(block) {
  const run = collectHorizontalRun(block);

  const index = run.findIndex(candidate =>
    sameLocation(
      candidate.location,
      block.location
    )
  );

  if (index < 0) return undefined;

  if (
    run.length % 2 === 1 &&
    index === run.length - 1
  ) {
    return undefined;
  }

  const partnerIndex =
    index % 2 === 0 ? index + 1 : index - 1;

  return run[partnerIndex];
}

function compatibleVertical(block, direction, typeId) {
  return Boolean(
    isVertical(block) &&
    block.typeId === typeId &&
    directionOf(block) === direction
  );
}

function collectVerticalColumn(seed) {
  if (!isVertical(seed)) return [];

  const direction = directionOf(seed);
  const typeId = seed.typeId;
  let bottom = seed;

  for (let step = 0; step < MAX_RUN; step++) {
    const below = bottom.dimension.getBlock(
      offset(bottom.location, DOWN)
    );

    if (
      !compatibleVertical(
        below,
        direction,
        typeId
      )
    ) {
      break;
    }

    bottom = below;
  }

  const column = [];
  let current = bottom;

  for (
    let step = 0;
    step < MAX_RUN &&
      compatibleVertical(current, direction, typeId);
    step++
  ) {
    column.push(current);

    const above = current.dimension.getBlock(
      offset(current.location, UP)
    );

    if (
      !compatibleVertical(
        above,
        direction,
        typeId
      )
    ) {
      break;
    }

    current = above;
  }

  return column;
}

function verticalConnectionAt(index, length) {
  const down = index > 0;
  const up = index + 1 < length;

  if (up && down) return "both";
  if (up) return "up";
  if (down) return "down";
  return "none";
}

function verticalHandleAt(index, length) {
  if (length <= 1) return "center";

  if (length % 2 === 1) {
    return index === Math.floor(length / 2)
      ? "center"
      : "none";
  }

  // Even columns place one short handle on the lower central member.
  return index === length / 2 - 1
    ? "seam"
    : "none";
}

function updateVerticalColumn(seed) {
  const column = collectVerticalColumn(seed);

  if (column.length === 0) return;

  let referenceHinge = "right";

  try {
    referenceHinge =
      column[0].permutation.getState(HINGE_STATE) ||
      "right";
  } catch {
    referenceHinge = "right";
  }

  for (
    let index = 0;
    index < column.length;
    index++
  ) {
    const block = column[index];

    try {
      const connection =
        verticalConnectionAt(index, column.length);

      const handlePosition =
        verticalHandleAt(index, column.length);

      let permutation = block.permutation;

      if (
        permutation.getState(
          VERTICAL_CONNECTION_STATE
        ) !== connection
      ) {
        permutation = permutation.withState(
          VERTICAL_CONNECTION_STATE,
          connection
        );
      }

      if (
        permutation.getState(
          HANDLE_POSITION_STATE
        ) !== handlePosition
      ) {
        permutation = permutation.withState(
          HANDLE_POSITION_STATE,
          handlePosition
        );
      }

      if (
        permutation.getState(HINGE_STATE) !==
        referenceHinge
      ) {
        permutation = permutation.withState(
          HINGE_STATE,
          referenceHinge
        );
      }

      if (permutation !== block.permutation) {
        block.setPermutation(permutation);
      }

      syncPanelVisual(block);
    } catch (error) {
      console.warn(
        "[Frame & Pane] No se pudo actualizar " +
        `una columna vertical: ${error}`
      );
    }
  }
}

function updateAfterBreak(
  dimension,
  location,
  brokenPermutation
) {
  const direction = directionOf(brokenPermutation);

  const sideVectors = SIDE_VECTORS[direction];

  if (sideVectors) {
    for (const vector of [
      sideVectors.left,
      sideVectors.right
    ]) {
      const neighbour = dimension.getBlock(
        offset(location, vector)
      );

      if (
        isHorizontal(neighbour) &&
        directionOf(neighbour) === direction
      ) {
        updateHorizontalRun(neighbour);
      }
    }
  }

  for (const vector of [UP, DOWN]) {
    const neighbour = dimension.getBlock(
      offset(location, vector)
    );

    if (
      isVertical(neighbour) &&
      directionOf(neighbour) === direction
    ) {
      updateVerticalColumn(neighbour);
    }
  }
}

function setOpen(block, opened) {
  if (!isWindow(block)) return;

  try {
    block.setPermutation(
      block.permutation.withState(
        OPEN_STATE,
        opened
      )
    );

    syncPanelVisual(block);
  } catch (error) {
    console.warn(
      "[Frame & Pane] No se pudo cambiar " +
      `una hoja: ${error}`
    );
  }
}

system.beforeEvents.startup.subscribe(event => {
  event.blockComponentRegistry.registerCustomComponent(
    COMPONENT_ID,
    {
      onPlace(componentEvent) {
        const block = componentEvent.block;

        system.run(() => {
          removePanelEntities(block);

          if (isHorizontal(block)) {
            updateHorizontalRun(block);
          } else if (isVertical(block)) {
            updateVerticalColumn(block);
          }
        });
      },

      onBreak(componentEvent) {
        const location = {
          ...componentEvent.block.location
        };

        const dimension = componentEvent.dimension;
        const brokenPermutation =
          componentEvent.brokenBlockPermutation;

        dropBrokenPanel(
          dimension,
          location,
          brokenPermutation
        );

        system.run(() =>
          updateAfterBreak(
            dimension,
            location,
            brokenPermutation
          )
        );
      },

      onPlayerInteract(interaction) {
        const block = interaction.block;
        const player = interaction.player;

        if (!isWindow(block) || !player) {
          return;
        }

        const hand = mainHand(player);
        const heldState = hand.item
          ? PANEL_ITEM_TO_STATE.get(hand.item.typeId)
          : undefined;

        if (heldState) {
          installPanel(
            block,
            player,
            hand.container,
            hand.item,
            heldState
          );
          return;
        }

        if (player.isSneaking && !hand.item) {
          removePanel(block, player);
          return;
        }

        if (!hasEmptyMainHand(player)) {
          return;
        }

        const opened =
          block.permutation.getState(OPEN_STATE) !==
          true;

        if (isVertical(block)) {
          for (
            const member of collectVerticalColumn(block)
          ) {
            setOpen(member, opened);
          }

          return;
        }

        setOpen(block, opened);

        const partner =
          pairedHorizontalWindow(block);

        if (partner) setOpen(partner, opened);
      }
    }
  );
});

system.run(() => {
  console.info(
    "[Frame & Pane] Release v1.0.0 activa: " +
    "paneles universales con entidad visual invocable y sin IA."
  );
});
