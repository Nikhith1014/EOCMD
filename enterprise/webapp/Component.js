sap.ui.define([
    "sap/ui/core/UIComponent",
    "enterprise/model/models",
    "sap/ui/model/json/JSONModel"
], function (UIComponent, models, JSONModel) {
    "use strict";

    return UIComponent.extend("enterprise.Component", {

        metadata: {
            manifest: "json"
        },

        init: function () {

               // 🔥 RESET HASH BEFORE ROUTER INITIALIZES
            // This prevents UI5 from loading the last route on refresh
            if (window.location.hash && window.location.hash !== "#/") {
                window.history.replaceState(null, "", window.location.pathname);
            }
            UIComponent.prototype.init.apply(this, arguments);

            this.setModel(models.createDeviceModel(), "device");

            // ✅ SINGLE SOURCE OF TRUTH
            this.setModel(new JSONModel({ items: [] }), "customers");

            this._loadCustomers();

            this.getRouter().initialize();
        },

        _loadCustomers: function () {
            fetch("https://jsonplaceholder.typicode.com/users")
                .then(r => r.json())
                .then(data => {
                    this.getModel("customers").setProperty("/items", data);
                });
        },

        // 🔥 CENTRAL DELETE
        deleteCustomer: function (id) {
            const oModel = this.getModel("customers");
            const aItems = oModel.getProperty("/items");

            const aUpdated = aItems.filter(c => c.id !== id);

            oModel.setProperty("/items", aUpdated);
        },

        // 🔥 CENTRAL ADD
        addCustomer: function (oCustomer) {
            const oModel = this.getModel("customers");
            const aItems = oModel.getProperty("/items");

            oModel.setProperty("/items", [...aItems, oCustomer]);
        },

        // 🔥 CENTRAL UPDATE
        updateCustomer: function (oCustomer) {
            const oModel = this.getModel("customers");
            const aItems = oModel.getProperty("/items").map(c =>
                c.id === oCustomer.id ? oCustomer : c
            );

            oModel.setProperty("/items", aItems);
        }
    });
});
