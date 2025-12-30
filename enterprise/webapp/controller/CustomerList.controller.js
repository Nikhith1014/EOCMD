sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
    "use strict";

    return Controller.extend("enterprise.controller.CustomerList", {

        onInit: async function () {
            const data = await fetch("https://jsonplaceholder.typicode.com/users").then(r => r.json());
            const oModel = new JSONModel(data);
            this.getView().setModel(oModel, "customers");
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("Dashboard");
        },
        onAddCustomer: function () {
            MessageToast.show("Add Customer feature coming soon!");
        },
        onLiveSearch: function () {
            const name = this.byId("nameField").getValue().toLowerCase();
            const city = this.byId("cityField").getValue().toLowerCase();
            const company = this.byId("companyField").getValue().toLowerCase();

            const allData = this._originalData || this.getView().getModel("customers").getData();
            if (!this._originalData) {
                this._originalData = JSON.parse(JSON.stringify(allData)); // backup original data
            }

            const result = this._originalData.filter(c => {
                return (
                    (name ? c.name.toLowerCase().includes(name) : true) &&
                    (city ? c.address.city.toLowerCase().includes(city) : true) &&
                    (company ? c.company.name.toLowerCase().includes(company) : true)
                );
            });

            this.getView().getModel("customers").setData(result);
        },
        onClear: function () {
            this.byId("nameField").setValue("");
            this.byId("cityField").setValue("");
            this.byId("companyField").setValue("");

            if (this._originalData) {
                this.getView().getModel("customers").setData(this._originalData);
            }
        },
        onRowPress: async function (oEvent) {
            const oItem = oEvent.getParameter("listItem");
            const sCustomerId = oItem.getBindingContext("customers").getProperty("id");

            // Fetch full customer details
            const customer = await fetch("https://jsonplaceholder.typicode.com/users/" + sCustomerId).then(r => r.json());
            this.getView().setModel(new sap.ui.model.json.JSONModel(customer), "detail");

            if (!this._customerDialog) {
                this._customerDialog = await sap.ui.core.Fragment.load({
                    name: "enterprise.fragment.CustomerDetailDialog",
                    controller: this
                });
                this.getView().addDependent(this._customerDialog);
            }

            this._customerDialog.open();
        },
        onCloseDialog: function () {
            this._customerDialog.close();
        },

    });
});
