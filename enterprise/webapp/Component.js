sap.ui.define([
    "sap/ui/core/UIComponent",
    "enterprise/model/models"
], function (UIComponent, models) {
    "use strict";

    return UIComponent.extend("enterprise.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init: function () {
            // 🔥 RESET HASH BEFORE ROUTER INITIALIZES
            // This prevents UI5 from loading the last route on refresh
            if (window.location.hash && window.location.hash !== "#/") {
                window.history.replaceState(null, "", window.location.pathname);
            }

            // call base component init
            UIComponent.prototype.init.apply(this, arguments);

            // set device model
            this.setModel(models.createDeviceModel(), "device");

            // now initialize router (will load default route only)
            this.getRouter().initialize();
        }
    });
});
