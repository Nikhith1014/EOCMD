sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    "sap/ui/export/Spreadsheet",    
    "sap/ui/export/library"
], function (Controller, JSONModel, Fragment, Spreadsheet, library) {
    "use strict";

    return Controller.extend("enterprise.controller.OrdersList", {

        onInit: function () {

            // UI state
            this.getView().setModel(
                new sap.ui.model.json.JSONModel({ editMode: false }),
                "ui"
            );

            // Orders view model (DERIVED)
            this.getView().setModel(
                new sap.ui.model.json.JSONModel({ items: [] }),
                "ordersView"
            );

            // Global models
            this._oOrdersModel =
                this.getOwnerComponent().getModel("orders");

            this._oCustomersModel =
                this.getOwnerComponent().getModel("customers");

            // LISTEN TO ORDERS CHANGES (THIS WAS MISSING)
            this._oOrdersModel
                .bindProperty("/items")
                .attachChange(this._onOrdersChanged, this);

            // LISTEN TO CUSTOMERS (for name mapping)
            this._oCustomersModel
                .bindProperty("/items")
                .attachChange(this._onOrdersChanged, this);

            // Initial build
            this._buildOrdersView();
        },

        _onOrdersChanged: function () {
            this._buildOrdersView();

            // FORCE TABLE UPDATE
            const oTable = this.byId("ordersTable");
            if (oTable) {
                oTable.getBinding("items").refresh(true);
            }
        },

        _buildOrdersView: function () {

            const aOrders =
                this._oOrdersModel.getProperty("/items") || [];

            const aCustomers =
                this._oCustomersModel.getProperty("/items") || [];

            const aMerged = aOrders.map(o => {
                const oCustomer = aCustomers.find(c => c.id === o.userId);

                return {
                    ...o,
                    customerName: oCustomer ? oCustomer.name : "Unknown"
                };
            });

            const oOrdersViewModel = this.getView().getModel("ordersView");

            oOrdersViewModel.setData({
                items: aMerged
            });

        },

        onRowPress: function (oEvent) {
            const oCtx = oEvent
                .getParameter("listItem")
                .getBindingContext("orders");

            const oCopy = JSON.parse(JSON.stringify(oCtx.getObject()));

            if (!this._oOrderDialog) {
                this._oOrderDialog = sap.ui.xmlfragment(
                    "enterprise.fragment.OrderDetailDialog",
                    this
                );
                this.getView().addDependent(this._oOrderDialog);
            }

            this._oOrderDialog.setModel(
                new sap.ui.model.json.JSONModel(oCopy),
                "orderEdit"
            );

            this._oOrderDialog.setModel(
                this.getView().getModel("ui"),
                "ui"
            );

            this.getView().getModel("ui").setProperty("/editMode", false);
            this._oOrderDialog.open();
        },

        onNavBack: function () {
            this.getOwnerComponent()
                .getRouter()
                .navTo("Dashboard");
        },

        onEditSave: async function (oEvent) {

            const oDialog = this._getDialogFromEvent(oEvent);
            const oUI = oDialog.getModel("ui");

            if (!oUI.getProperty("/editMode")) {
                oUI.setProperty("/editMode", true);
                return;
            }

            const oEditData =
                oDialog.getModel("orderEdit").getData();

            await fetch(
                `https://jsonplaceholder.typicode.com/posts/${oEditData.id}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(oEditData)
                }
            );

            const oOrdersModel =
                this.getOwnerComponent().getModel("orders");

            const aItems =
                oOrdersModel.getProperty("/items");

            const aUpdatedItems = aItems.map(o =>
                o.id === oEditData.id
                    ? {
                        ...o,
                        title: oEditData.title,
                        status: oEditData.status   
                    }
                    : { ...o }
            );

            oOrdersModel.setProperty("/items", aUpdatedItems);

            // rebuild merged view
            this._buildOrdersView();

            // force UI refresh
            this.byId("ordersTable")
                .getBinding("items")
                .refresh(true);

            oUI.setProperty("/editMode", false);
            sap.m.MessageToast.show("Order updated");
        },

        onDeleteOrder: async function (oEvent) {

            const oDialog = this._getDialogFromEvent(oEvent);
            const oOrder = oDialog.getModel("orderEdit").getData();

            await fetch(
                `https://jsonplaceholder.typicode.com/posts/${oOrder.id}`,
                { method: "DELETE" }
            );

            const oOrdersModel =
                this.getOwnerComponent().getModel("orders");

            const aItems =
                oOrdersModel.getProperty("/items");

            const aUpdatedItems = aItems
                .filter(o => o.id !== oOrder.id)
                .map(o => ({ ...o }));

            oOrdersModel.setProperty("/items", aUpdatedItems);

            this._buildOrdersView();

            oDialog.close();
            sap.m.MessageToast.show("Order deleted");
        },

        onCloseDialog: function (oEvent) {
            const oDialog = this._getDialogFromEvent(oEvent);
            oDialog.close();
        },
        _getDialogFromEvent: function (oEvent) {
            return oEvent.getSource().getParent().getParent();
        },

        onAddOrder: function () {

            if (!this._oCreateDialog) {
                this._oCreateDialog = sap.ui.xmlfragment(
                    "enterprise.fragment.CreateOrderDialog",
                    this
                );
                this.getView().addDependent(this._oCreateDialog);
            }

            // new order model
            this._oCreateDialog.setModel(
                new sap.ui.model.json.JSONModel({
                    userId: null,
                    customerName: "",
                    title: "",
                    status: "Pending"
                }),
                "newOrder"
            );

            // reuse customers model
            this._oCreateDialog.setModel(
                this.getOwnerComponent().getModel("customers"),
                "customers"
            );

            this._oCreateDialog.open();
        },

        onCloseCreateDialog: function () {
            this._oCreateDialog.close();
        },

        onSuggestCustomer: function (oEvent) {
            const sValue = oEvent.getParameter("suggestValue");
            const oInput = oEvent.getSource();

            const oBinding = oInput.getBinding("suggestionItems");
            if (!oBinding) return;

            const aFilters = sValue
                ? [new sap.ui.model.Filter(
                    "name",
                    sap.ui.model.FilterOperator.Contains,
                    sValue
                )]
                : [];

            oBinding.filter(aFilters);
        },

        onCustomerSelected: function (oEvent) {
            const oItem = oEvent.getParameter("selectedItem");
            if (!oItem) return;

            const oNewOrderModel =
                this._oCreateDialog.getModel("newOrder");

            oNewOrderModel.setProperty("/userId", Number(oItem.getKey()));
            oNewOrderModel.setProperty("/customerName", oItem.getText());
        },
        onCreateOrder: async function () {

            const oDialog = this._oCreateDialog;
            const oNewOrder = oDialog.getModel("newOrder").getData();

            if (!oNewOrder.userId || !oNewOrder.title) {
                sap.m.MessageToast.show("Please select a customer and enter title");
                return;
            }


            const oOrderToCreate = {
                id: Date.now(),        // mock ID
                userId: Number(oNewOrder.userId),
                title: oNewOrder.title,
                status: oNewOrder.status
            };

            // mock REST
            await fetch(
                "https://jsonplaceholder.typicode.com/posts",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(oOrderToCreate)
                }
            );

            this.getOwnerComponent().addOrder(oOrderToCreate);
            oDialog.close();
            sap.m.MessageToast.show("Order created");
        },

        formatCustomerName: function (iUserId) {
            const aCustomers =
                this.getOwnerComponent()
                    .getModel("customers")
                    .getProperty("/items") || [];

            const oCustomer =
                aCustomers.find(c => c.id === iUserId);

            return oCustomer ? oCustomer.name : "Unknown";
        },

        onSortById: function () {
            const oTable = this.byId("ordersTable");
            const oBinding = oTable.getBinding("items");

            oBinding.sort([
                new sap.ui.model.Sorter("id", false) // false = ascending
            ]);
        },

        onSortByStatus: function () {
            const oBinding = this.byId("ordersTable").getBinding("items");

            const oSorter = new sap.ui.model.Sorter(
                "statusRank",
                false // ascending → Pending first
            );

            oBinding.sort(oSorter);
        },
        onFilterOrders: function (oEvent) {
            const oView = this.getView();
            const oTable = this.byId("ordersTable");
            const oBinding = oTable.getBinding("items");

            const sCustomer =
                oView.byId(oEvent.getSource().getId())
                    ?.getValue?.()
                    ?.toLowerCase() || "";

            const sStatus =
                oEvent.getSource().getSelectedKey?.() || "";

            const aFilters = [];

            if (sCustomer) {
                aFilters.push(
                    new sap.ui.model.Filter(
                        "customerName",
                        sap.ui.model.FilterOperator.Contains,
                        sCustomer
                    )
                );
            }

            if (sStatus) {
                aFilters.push(
                    new sap.ui.model.Filter(
                        "status",
                        sap.ui.model.FilterOperator.EQ,
                        sStatus
                    )
                );
            }

            oBinding.filter(aFilters);
        },

        onExportOrders: function () {
            const aData =
                this.getView().getModel("ordersView").getProperty("/items");

            if (!aData || !aData.length) {
                MessageToast.show("No data to export");
                return;
            }

            const aColumns = [
                { label: "Order ID", property: "id" },
                { label: "Customer", property: "customerName" },
                { label: "Title", property: "title" },
                { label: "Status", property: "status" }
            ];

            const oSpreadsheet = new Spreadsheet({
                workbook: { columns: aColumns },
                dataSource: aData,
                fileName: "Orders.xlsx"
            });

            oSpreadsheet.build().finally(() => {
                oSpreadsheet.destroy();
            });
        },

        onLiveSearchCustomer: function (oEvent) {
            const sQuery = oEvent.getSource().getValue().toLowerCase();
            const oTable = this.byId("ordersTable");
            const oBinding = oTable.getBinding("items");

            if (!sQuery) {
                oBinding.filter([]);
                return;
            }

            const aCustomers =
                this.getOwnerComponent()
                    .getModel("customers")
                    .getProperty("/items") || [];

            const oFilter = new sap.ui.model.Filter({
                path: "userId",
                operator: sap.ui.model.FilterOperator.Custom,
                test: function (iUserId) {
                    const oCustomer =
                        aCustomers.find(c => c.id === iUserId);

                    return oCustomer
                        ? oCustomer.name.toLowerCase().includes(sQuery)
                        : false;
                }
            });

            oBinding.filter([oFilter]);
        },

        onFilterByStatus: function (oEvent) {
            const sStatus = oEvent.getSource().getSelectedKey();
            const oBinding = this.byId("ordersTable").getBinding("items");

            if (!sStatus) {
                oBinding.filter([]);
                return;
            }

            const oFilter = new sap.ui.model.Filter(
                "status",
                sap.ui.model.FilterOperator.EQ,
                sStatus
            );

            oBinding.filter([oFilter]);
        },

        onSortByOrderId: function () {
            if (this._bOrderIdDesc === undefined) {
                this._bOrderIdDesc = false;
            }

            this._bOrderIdDesc = !this._bOrderIdDesc;

            const oBinding = this.byId("ordersTable").getBinding("items");

            const oSorter = new sap.ui.model.Sorter(
                "id",
                this._bOrderIdDesc // true = DESC, false = ASC
            );

            oBinding.sort(oSorter);
        }

    });
});
