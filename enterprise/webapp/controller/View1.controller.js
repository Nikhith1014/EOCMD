sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], function (Controller, JSONModel) {
    "use strict";

    return Controller.extend("enterprise.controller.View1", {

        onInit: function () {
            // Dashboard derived model
            const oDashboardModel = new sap.ui.model.json.JSONModel({
                totalCustomers: 0,
                totalOrders: 0,
                pendingOrders: 0,
                ordersPerCustomer: [],
                orderStatus: []
            });
            this.getView().setModel(oDashboardModel, "dashboard");

            // Global customers model
            this._oCustomersModel = this.getOwnerComponent().getModel("customers");

            // 🔥 LISTEN TO /items BINDING (NOT THE MODEL)
            this._oCustomersBinding = this._oCustomersModel
                .bindProperty("/items");

            this._oCustomersBinding.attachChange(
                this._recalculateDashboard,
                this
            );

            // Load orders once
            this._loadOrders();
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
            const aOrders = this._aOrders || [];

            const totalCustomers = aCustomers.length;
            const totalOrders = aOrders.length;

            const pendingOrders =
                aOrders.filter(o => o.userId === 1).length;

            const ordersPerCustomer = aCustomers.map(c => ({
                name: c.name,
                orders: aOrders.filter(o => o.userId === c.id).length
            }));

            const orderStatus = [
                { status: "Completed", count: totalOrders - pendingOrders },
                { status: "Pending", count: pendingOrders }
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
        }
    });
});
