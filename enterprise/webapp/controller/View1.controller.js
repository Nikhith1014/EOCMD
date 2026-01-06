sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], function (Controller, JSONModel) {
    "use strict";

    return Controller.extend("enterprise.controller.View1", {
        onInit: function () {

            this.getView().setModel(
                new sap.ui.model.json.JSONModel({
                    totalCustomers: 0,
                    totalOrders: 0,
                    pendingOrders: 0,
                    ordersPerCustomer: [],
                    orderStatus: []
                }),
                "dashboard"
            );

            this._oCustomersModel =
                this.getOwnerComponent().getModel("customers");

            this._oOrdersModel =
                this.getOwnerComponent().getModel("orders");

            // LISTEN TO BOTH MODELS
            this._oCustomersModel
                .bindProperty("/items")
                .attachChange(this._recalculateDashboard, this);

            this._oOrdersModel
                .bindProperty("/items")
                .attachChange(this._recalculateDashboard, this);

            this._recalculateDashboard();
        },



        /* =======================
           LOAD ORDERS
        ======================= */
        async _loadOrders() {
            try {
                const aOrders = await fetch(
                    "https://jsonplaceholder.typicode.com/posts"
                ).then(r => r.json());

                this._aOrders = aOrders;

                // Initial calculation
                this._recalculateDashboard();

            } catch (e) {
                console.error("Orders API error:", e);
            }
        },

        /* =======================
           KPI + CHART RECALC
        ======================= */
        _recalculateDashboard: function () {

            const aCustomers =
                this._oCustomersModel.getProperty("/items") || [];

            const aOrders =
                this._oOrdersModel.getProperty("/items") || [];

            const totalCustomers = aCustomers.length;
            const totalOrders = aOrders.length;

            const pendingOrders =
                aOrders.filter(o => o.status === "Pending").length;

            const completedOrders =
                aOrders.filter(o => o.status === "Completed").length;

            const cancelledOrders =
                aOrders.filter(o => o.status === "Cancelled").length;

            const ordersPerCustomer = aCustomers.map(c => ({
                name: c.name,
                orders: aOrders.filter(o => o.userId === c.id).length
            }));

            const orderStatus = [
                { status: "Completed", count: completedOrders },
                { status: "Pending", count: pendingOrders },
                { status: "Cancelled", count: cancelledOrders }
            ];

            this.getView().getModel("dashboard").setData({
                totalCustomers,
                totalOrders,
                pendingOrders,
                ordersPerCustomer,
                orderStatus
            });
        },
        /* =======================
           NAVIGATION
        ======================= */
        onNavToCustomers: function () {
            this.getOwnerComponent().getRouter().navTo("CustomerList");
        },
        
        onNavToOrders: function () {
            this.getOwnerComponent().getRouter().navTo("Orders");
        }

    });
});
