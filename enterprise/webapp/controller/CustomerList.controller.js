sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/export/Spreadsheet"
], function (Controller, JSONModel, MessageToast, MessageBox, Spreadsheet) {
    "use strict";

    return Controller.extend("enterprise.controller.CustomerList", {

        onInit: async function () {
            this.getView().setModel(
                new sap.ui.model.json.JSONModel({ editMode: false }),
                "ui"
            );
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("Dashboard");
        },
        // onLiveSearch: function () {
        //     const name = this.byId("nameField").getValue().toLowerCase();
        //     const city = this.byId("cityField").getValue().toLowerCase();
        //     const company = this.byId("companyField").getValue().toLowerCase();

        //     const allData = this._originalData || this.getView().getModel("customers").getData();
        //     if (!this._originalData) {
        //         this._originalData = JSON.parse(JSON.stringify(allData)); // backup original data
        //     }

        //     const result = this._originalData.filter(c => {
        //         return (
        //             (name ? c.name.toLowerCase().includes(name) : true) &&
        //             (city ? c.address.city.toLowerCase().includes(city) : true) &&
        //             (company ? c.company.name.toLowerCase().includes(company) : true)
        //         );
        //     });

        //     this.getView().getModel("customers").setData(result);
        // },
        onLiveSearch: function () {
            const sName = this.byId("nameField").getValue().toLowerCase();
            const sCity = this.byId("cityField").getValue().toLowerCase();
            const sCompany = this.byId("companyField").getValue().toLowerCase();

            const oTable = this.byId("customerTable");
            const oBinding = oTable.getBinding("items");

            const aFilters = [];

            if (sName) {
                aFilters.push(
                    new sap.ui.model.Filter("name",
                        sap.ui.model.FilterOperator.Contains,
                        sName
                    )
                );
            }

            if (sCity) {
                aFilters.push(
                    new sap.ui.model.Filter("address/city",
                        sap.ui.model.FilterOperator.Contains,
                        sCity
                    )
                );
            }

            if (sCompany) {
                aFilters.push(
                    new sap.ui.model.Filter("company/name",
                        sap.ui.model.FilterOperator.Contains,
                        sCompany
                    )
                );
            }

            // AND logic
            const oFinalFilter = new sap.ui.model.Filter({
                filters: aFilters,
                and: true
            });

            oBinding.filter(aFilters.length ? oFinalFilter : []);
        },
        onClear: function () {
            this.byId("nameField").setValue("");
            this.byId("cityField").setValue("");
            this.byId("companyField").setValue("");

            const oTable = this.byId("customerTable");
            oTable.getBinding("items").filter([]);
        },

        onCloseDialog: function () {
            this.getView().getModel("ui").setProperty("/editMode", false);
            this._oCustomerDialog.close();

        },
        onRowPress: function (oEvent) {
            const oCtx = oEvent
                .getParameter("listItem")
                .getBindingContext("customers");

            const oCopy = JSON.parse(JSON.stringify(oCtx.getObject()));

            if (!this._oCustomerDialog) {
                this._oCustomerDialog = sap.ui.xmlfragment(
                    "enterprise.fragment.CustomerDetailDialog",
                    this
                );
                this.getView().addDependent(this._oCustomerDialog);
            }

            // set models
            this.getView().setModel(
                new sap.ui.model.json.JSONModel(oCopy),
                "customerEdit"
            );

            this._oCustomerDialog.setModel(
                this.getView().getModel("customerEdit"),
                "customerEdit"
            );

            this._oCustomerDialog.setModel(
                this.getView().getModel("ui"),
                "ui"
            );

            // reset UI state
            this.getView().getModel("ui").setProperty("/editMode", false);

            // store original path for save/delete
            this._sCustomerPath = oCtx.getPath();

            this._oCustomerDialog.open();
        },

        onEditSave: async function () {
            const oUI = this.getView().getModel("ui");
            const bEdit = oUI.getProperty("/editMode");

            // ENTER EDIT MODE
            if (!bEdit) {
                oUI.setProperty("/editMode", true);
                return;
            }

            // SAVE MODE
            const oEditData = this.getView()
                .getModel("customerEdit")
                .getData();

            // REST PUT (mock)
            await fetch(
                `https://jsonplaceholder.typicode.com/users/${oEditData.id}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(oEditData)
                }
            );

            // 🔥 CRITICAL PART
            const oCustomersModel =
                this.getOwnerComponent().getModel("customers");

            const aItems =
                oCustomersModel.getProperty("/items");

            // 🔥 REPLACE FULL ARRAY (forces change detection)
            const aUpdatedItems = aItems.map(c =>
                c.id === oEditData.id
                    ? { ...oEditData }     // new object
                    : { ...c }             // clone
            );

            oCustomersModel.setProperty("/items", aUpdatedItems);

            oUI.setProperty("/editMode", false);
            sap.m.MessageToast.show("Customer updated");
        },

        onValidateEmail: function (oEvent) {
            const sValue = oEvent.getParameter("value");
            const oInput = oEvent.getSource();

            const bValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sValue);

            oInput.setValueState(bValid ? "None" : "Error");
            oInput.setValueStateText("Invalid email format");
        },
        onValidatePhone: function (oEvent) {
            const sValue = oEvent.getParameter("value");
            const oInput = oEvent.getSource();

            const bValid = /^[0-9+\-\s()x]+$/.test(sValue);

            oInput.setValueState(bValid ? "None" : "Error");
            oInput.setValueStateText("Invalid phone number");
        },
        onCancelClose: function () {
            const oUI = this.getView().getModel("ui");

            if (oUI.getProperty("/editMode")) {
                oUI.setProperty("/editMode", false);
                sap.m.MessageToast.show("Changes discarded");
            } else {
                this._oCustomerDialog.close();
            }
        },

        onAddCustomer: function () {
            if (!this._oCreateDialog) {
                this._oCreateDialog = sap.ui.xmlfragment(
                    "enterprise.fragment.CreateCustomerDialog",
                    this
                );
                this.getView().addDependent(this._oCreateDialog);
            }

            this.getView().setModel(
                new sap.ui.model.json.JSONModel({
                    name: "",
                    username: "",
                    email: "",
                    phone: "",
                    website: "",
                    address: { city: "" },
                    company: { name: "" }
                }),
                "newCustomer"
            );

            this._oCreateDialog.setModel(
                this.getView().getModel("newCustomer"),
                "newCustomer"
            );

            this._oCreateDialog.open();
        },

        onCancelCreateCustomer: function () {
            this._oCreateDialog.close();
        },
        onExportExcel: function () {
            const oTable = this.byId("customerTable");
            const oBinding = oTable.getBinding("items");

            // 🔹 Get only filtered + visible rows
            const aContexts = oBinding.getContexts(0, oBinding.getLength());

            const aData = aContexts.map(oCtx => {
                const o = oCtx.getObject();
                return {
                    id: o.id,
                    name: o.name,
                    username: o.username,
                    email: o.email,
                    phone: o.phone,
                    city: o.address?.city || "",
                    company: o.company?.name || ""
                };
            });

            if (!aData.length) {
                sap.m.MessageToast.show("No data to export");
                return;
            }

            const aCols = [
                { label: "ID", property: "id" },
                { label: "Name", property: "name" },
                { label: "Username", property: "username" },
                { label: "Email", property: "email" },
                { label: "Phone", property: "phone" },
                { label: "City", property: "city" },
                { label: "Company", property: "company" }
            ];

            const oSettings = {
                workbook: { columns: aCols },
                dataSource: aData,
                fileName: "Customers_Filtered.xlsx"
            };

            const oSheet = new sap.ui.export.Spreadsheet(oSettings);
            oSheet.build().finally(() => oSheet.destroy());
        },
        onExportSelected: function () {
            const oTable = this.byId("customerTable");
            const aSelectedItems = oTable.getSelectedItems();

            if (!aSelectedItems.length) {
                sap.m.MessageToast.show("Please select at least one customer");
                return;
            }

            const aData = aSelectedItems.map(oItem => {
                const oCtx = oItem.getBindingContext("customers");
                const o = oCtx.getObject();

                return {
                    id: o.id,
                    name: o.name,
                    username: o.username,
                    email: o.email,
                    phone: o.phone,
                    city: o.address?.city || "",
                    company: o.company?.name || ""
                };
            });

            const aCols = [
                { label: "ID", property: "id" },
                { label: "Name", property: "name" },
                { label: "Username", property: "username" },
                { label: "Email", property: "email" },
                { label: "Phone", property: "phone" },
                { label: "City", property: "city" },
                { label: "Company", property: "company" }
            ];

            const oSettings = {
                workbook: { columns: aCols },
                dataSource: aData,
                fileName: "Customers_Selected.xlsx"
            };

            const oSheet = new sap.ui.export.Spreadsheet(oSettings);
            oSheet.build().finally(() => oSheet.destroy());
        },

        onCreateCustomer: function () {
            const oCustomersModel =
                this.getOwnerComponent().getModel("customers");

            const oNewCustomer =
                this.getView().getModel("newCustomer").getData();

            const aItems =
                oCustomersModel.getProperty("/items");

            oCustomersModel.setProperty("/items", [
                ...aItems.map(c => ({ ...c })),
                { ...oNewCustomer, id: Date.now() }
            ]);

            // 🔑 FORCE TABLE UI UPDATE
            this.byId("customerTable").getBinding("items").refresh(true);

            this._oCreateDialog.close();
        },
        onDeleteCustomer: async function () {
            const oCustomer =
                this.getView().getModel("customerEdit").getData();

            await fetch(
                `https://jsonplaceholder.typicode.com/users/${oCustomer.id}`,
                { method: "DELETE" }
            );

            const oCustomersModel =
                this.getOwnerComponent().getModel("customers");

            const aItems =
                oCustomersModel.getProperty("/items");

            const aUpdatedItems = aItems
                .filter(c => c.id !== oCustomer.id)
                .map(c => ({ ...c }));

            oCustomersModel.setProperty("/items", aUpdatedItems);

            // 🔑 FORCE TABLE UI UPDATE
            this.byId("customerTable").getBinding("items").refresh(true);

            this._oCustomerDialog.close();
        }



    });
});
