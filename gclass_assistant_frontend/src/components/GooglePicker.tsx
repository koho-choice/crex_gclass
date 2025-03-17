import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

const GooglePicker = ({ onFileSelect }) => {
  const { user } = useAuth();
  const [pickerApiLoaded, setPickerApiLoaded] = useState(false);

  // Dynamically load the Google API script and Picker API
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.onload = () => {
      console.log("Google API script loaded");
      window.gapi.load("picker", { callback: onPickerApiLoad });
    };
    document.body.appendChild(script);
  }, []);

  // Callback when the Picker API is loaded
  const onPickerApiLoad = () => {
    console.log("Picker API loaded");
    setPickerApiLoaded(true);
  };

  // Function to create and display the Picker with the given access token
  const createPicker = (oauthToken) => {
    if (pickerApiLoaded && oauthToken) {
      console.log("Creating picker with token:", oauthToken);
      const view = new window.google.picker.DocsView(
        window.google.picker.ViewId.DOCS
      )
        .setMimeTypes(
          "application/pdf,application/vnd.google-apps.spreadsheet,application/vnd.google-apps.document"
        )
        .setLabel("Select Rubric");

      const picker = new window.google.picker.PickerBuilder()
        .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
        .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
        .setOAuthToken(oauthToken)
        .addView(view)
        .setDeveloperKey(import.meta.env.VITE_PICKER_API_KEY)
        .setCallback(pickerCallback)
        .build();
      picker.setVisible(true);
    } else {
      console.error("Picker API not loaded or OAuth token missing");
    }
  };

  // Callback when a file is picked
  const pickerCallback = (data) => {
    if (data.action === window.google.picker.Action.PICKED) {
      const doc = data.docs[0]; // Assuming single selection
      const fileId = doc.id;
      onFileSelect(fileId);
    }
  };

  // Handler for the button click: fetch the token and open the picker
  const handlePicker = async () => {
    console.log("Opening picker...");
    const accessToken = await fetchDecryptedToken();
    if (accessToken) {
      createPicker(accessToken);
    } else {
      console.error("Unable to fetch decrypted access token");
    }
  };

  async function fetchDecryptedToken() {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/classroom/access_token?email=${user?.email}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) {
        throw new Error(`Error fetching token: ${response.statusText}`);
      }
      const data = await response.json();
      return data.access_token;
    } catch (error) {
      console.error("Error fetching decrypted token:", error);
      return null;
    }
  }

  return (
    <div>
      <button onClick={handlePicker}>Upload Rubric from Drive</button>
    </div>
  );
};

export default GooglePicker;
