import React, { useRef } from "react";

import { BrowserRouter as Router, Prompt } from "react-router-dom";

import { useOrchest } from "@/hooks/orchest";

import Dialogs from "./components/Dialogs";
import HeaderBar from "./components/HeaderBar";
import MainDrawer from "./components/MainDrawer";
import Jupyter from "./jupyter/Jupyter";

import { Routes } from "@/Routes";

import { loadIntercom } from "./utils/webserver-utils";
import { useSendAnalyticEvent } from "./hooks/useSendAnalyticEvent";

import $ from "jquery";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
$.fn.overflowing = function () {
  let overflowed = false;

  this.each(function () {
    let el = $(this)[0];

    if (el.offsetHeight < el.scrollHeight || el.offsetWidth < el.scrollWidth) {
      overflowed = true;
    } else {
      overflowed = false;
    }
  });

  return overflowed;
};

window.$ = $;

const App = () => {
  const [jupyter, setJupyter] = React.useState(null);

  const sendEvent = useSendAnalyticEvent();

  const context = useOrchest();

  const jupyterRef = useRef(null);
  const dialogsRef = useRef(null);

  // load server side config populated by flask template
  const { config } = context.state;

  React.useEffect(() => {
    if (config.FLASK_ENV === "development") {
      console.log("Orchest is running with --dev.");
    }

    if (config.CLOUD === true) {
      console.log("Orchest is running with --cloud.");

      loadIntercom(
        config["INTERCOM_APP_ID"],
        config["INTERCOM_USER_EMAIL"],
        config["INTERCOM_DEFAULT_SIGNUP_DATE"]
      );
    }
  }, [config]);

  const alert = (title, content, onClose) => {
    // Analytics call
    sendEvent("alert show", { title: title, content: content });

    dialogsRef.current.alert(title, content, onClose);
  };

  const confirm = (
    title: string,
    content: string,
    onConfirm: () => void,
    onCancel?
  ) => {
    // Analytics call
    sendEvent("confirm show", { title: title, content: content });

    dialogsRef.current.confirm(title, content, onConfirm, onCancel);
  };

  const requestBuild = (
    project_uuid: string,
    environmentValidationData,
    requestedFromView,
    onBuildComplete,
    onCancel: () => void
  ) => {
    // Analytics call
    sendEvent("build request", {
      requestedFromView: requestedFromView,
    });

    dialogsRef.current.requestBuild(
      project_uuid,
      environmentValidationData,
      requestedFromView,
      onBuildComplete,
      onCancel
    );
  };

  React.useEffect(() => {
    setJupyter(new Jupyter(jupyterRef.current));
  }, []);

  window.orchest = {
    config,
    alert,
    confirm,
    requestBuild,
    jupyter,
  };

  return (
    <Router
      getUserConfirmation={(message, callback) => {
        // use Prompt component to intercept route changes
        // handle the blocking event here
        if (message === "unsavedChanges") {
          window.orchest.confirm(
            "Warning",
            "There are unsaved changes. Are you sure you want to navigate away?",
            () => {
              context.dispatch({ type: "setUnsavedChanges", payload: false });
              callback(true);
            }
          );
        }
      }}
    >
      <Prompt when={context.state.unsavedChanges} message="unsavedChanges" />
      <HeaderBar />
      <div className="app-container" data-test-id="app">
        <MainDrawer />
        <main className="main-content" id="main-content">
          <Routes />
          <div ref={jupyterRef} className="persistent-view jupyter hidden" />
        </main>
      </div>
      <div className="dialogs">
        <Dialogs ref={dialogsRef} />
      </div>
    </Router>
  );
};

export default App;
