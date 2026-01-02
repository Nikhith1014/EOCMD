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
            const data = await fetch("https://jsonplaceholder.typicode.com/users").then(r => r.json());
            const oModel = new JSONModel(data);
            this.getView().setModel(oModel, "customers");

            this.getView().setModel(
                new sap.ui.model.json.JSONModel({ editMode: false }),
                "ui"
            );
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("Dashboard");
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
        onRowPress: function (oEvent) {
            const oItem = oEvent.getParameter("listItem");
            const oCtx = oItem.getBindingContext("customers");

            if (!this._oCustomerDialog) {
                this._oCustomerDialog = sap.ui.xmlfragment(
                    "enterprise.fragment.CustomerDetailDialog",
                    this
                );
                this.getView().addDependent(this._oCustomerDialog);
            }

            this._oCustomerDialog.setModel(oCtx.getModel(), "customer");
            this._oCustomerDialog.bindElement("customer>" + oCtx.getPath());
            this._oCustomerDialog.open();
        },

        onCloseDialog: function () {
            // if (this._oCustomerDialog) {
            //     this._oCustomerDialog.close();
            // } else {
            //     console.warn("⚠️ Dialog is not created yet.");
            // }
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

            if (!bEdit) {
                oUI.setProperty("/editMode", true);
                return;
            }

            // SAVE
            const oData = this.getView().getModel("customerEdit").getData();

            await fetch(
                `https://jsonplaceholder.typicode.com/users/${oData.id}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(oData)
                }
            );

            this.getView()
                .getModel("customers")
                .setProperty(this._sCustomerPath, oData);

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
        onDeleteCustomer: function () {
            const oEditModel = this.getView().getModel("customerEdit");
            const oCustomersModel = this.getView().getModel("customers");

            const oData = oEditModel.getData();
            const sPath = this._sCustomerPath;

            MessageBox.confirm(
                `Are you sure you want to delete ${oData.name}?`,
                {
                    actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
                    emphasizedAction: MessageBox.Action.DELETE,
                    onClose: async (sAction) => {
                        if (sAction !== MessageBox.Action.DELETE) {
                            return;
                        }

                        // 🔹 REST DELETE (mock)
                        await fetch(
                            `https://jsonplaceholder.typicode.com/users/${oData.id}`,
                            { method: "DELETE" }
                        );

                        // 🔹 Remove from table model
                        const iIndex = parseInt(sPath.split("/")[2], 10);
                        const aData = oCustomersModel.getProperty("/");

                        aData.splice(iIndex, 1);
                        oCustomersModel.setProperty("/", aData);

                        this._oCustomerDialog.close();

                        MessageToast.show("Customer deleted");
                    }
                }
            );
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
        onCreateCustomer: async function () {
            const oModel = this.getView().getModel("newCustomer");
            const oData = oModel.getData();
            const oCustomersModel = this.getView().getModel("customers");

            // REST POST (mock)
            const res = await fetch(
                "https://jsonplaceholder.typicode.com/users",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(oData)
                }
            );
            const created = await res.json();

            const aCustomers = oCustomersModel.getProperty("/");
            created.id = aCustomers.length + 1;
            aCustomers.push(created);

            oCustomersModel.setProperty("/", aCustomers);

            this._oCreateDialog.close();
            sap.m.MessageToast.show("Customer created");
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
        }
    });
});
