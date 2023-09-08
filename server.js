const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();
const port = process.env.PORT || 3000;
const dataSource = require("./dataSource");

app.use(cors());

// Middleware to parse JSON data
app.use(bodyParser.json());

// Create a function to map the plugin data
const mapPluginData = (pluginId, status, isDisabled) => {
  const plugin = {
    title: dataSource.data.plugins[pluginId].title,
    description: dataSource.data.plugins[pluginId].description,
    status: status,
    isDisabled: isDisabled,
    pluginId,
  };
  return plugin;
};

// GET API to retrieve the transformed data for a specific tab
app.get("/api/tab/:tabId", (req, res) => {
  const tabId = req.params.tabId;

  if (!dataSource.data.tabdata[tabId]) {
    res.status(404).json({ message: "Tab not found" });
    return;
  }

  const tabData = dataSource.data.tabdata[tabId];

  const enabledPlugins = [...tabData.active, ...tabData.inactive];
  const disabledPlugins = [...tabData.disabled];

  let pluginData;

  if (enabledPlugins.length === disabledPlugins.length) {
    pluginData = [
      ...tabData.disabled.map((pluginId) => {
        const status = tabData.active.includes(pluginId)
          ? "Active"
          : "Inactive";
        return mapPluginData(pluginId, status, true);
      }),
    ];
  } else {
    pluginData = [
      ...tabData.active.map((pluginId) =>
        mapPluginData(pluginId, "Active", false)
      ),
      ...tabData.inactive.map((pluginId) =>
        mapPluginData(pluginId, "Inactive", false)
      ),
    ];
  }

  // Transform the data into the desired format
  const transformedData = {
    title: tabData.title,
    icon: tabData.icon,
    plugins: pluginData,
  };

  // Sort the plugins array based on their titles
  transformedData.plugins.sort((a, b) => {
    const titleA = a.title.toUpperCase();
    const titleB = b.title.toUpperCase();
    if (titleA < titleB) {
      return -1;
    }
    if (titleA > titleB) {
      return 1;
    }
    return 0;
  });

  res.json(transformedData);
});

// POST API to update plugin status
app.post("/api/tab/:tabId/update", (req, res) => {
  const tabId = req.params.tabId;
  const { pluginId, newStatus } = req.body;

  if (!dataSource.data.tabdata[tabId]) {
    res.status(404).json({ message: "Tab not found" });
    return;
  }

  const tabData = dataSource.data.tabdata[tabId];
  const { active, inactive, disabled } = tabData;

  const newStatusSmallCase = newStatus.toLowerCase();

  // Update the status of the plugin
  switch (newStatusSmallCase) {
    case "active":
      removeFromArray(disabled, pluginId);
      if (!active.includes(pluginId)) {
        active.push(pluginId);
      }
      removeFromArray(inactive, pluginId);
      break;
    case "inactive":
      removeFromArray(disabled, pluginId);
      if (!inactive.includes(pluginId)) {
        inactive.push(pluginId);
      }
      removeFromArray(active, pluginId);
      break;
    case "disabled":
      removeFromArray(active, pluginId);
      removeFromArray(inactive, pluginId);
      if (!disabled.includes(pluginId)) {
        disabled.push(pluginId);
      }
      break;
    default:
      res.status(400).json({ message: "Invalid status" });
      return;
  }

  res.json({ message: "Plugin status updated successfully" });
});

app.post("/api/tab/:tabId/toggle-disable", (req, res) => {
  const tabId = req.params.tabId;
  const { isEnabled } = req.body;

  if (!dataSource.data.tabdata[tabId]) {
    res.status(404).json({ message: "Tab not found" });
    return;
  }

  const tabData = dataSource.data.tabdata[tabId];

  // Loop through all plugins in the tab and mark them as disabled
  if (isEnabled) {
    tabData.disabled = [];
  } else {
    tabData.disabled = [
      ...tabData.disabled,
      ...tabData.active,
      ...tabData.inactive,
    ];
  }

  res.json({
    message: `All plugins in the tab have been ${
      isEnabled ? "enabled" : "disabled"
    }`,
  });
});

// Helper function to remove an item from an array
function removeFromArray(arr, item) {
  const index = arr.indexOf(item);
  if (index !== -1) {
    arr.splice(index, 1);
  }
}

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
