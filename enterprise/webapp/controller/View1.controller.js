sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], function (Controller, JSONModel) {
    "use strict";

    return Controller.extend("enterprise.controller.View1", {

        onInit: function () {
            const oModel = new JSONModel({
                totalCustomers: 0,
                totalOrders: 0,
                pendingOrders: 0,
                ordersPerCustomer: [],
                orderStatus: []
            });

            this.getView().setModel(oModel, "dashboard");
            this.loadFromAPI();
        },

        async loadFromAPI() {
            try {
                const users = await fetch("https://jsonplaceholder.typicode.com/users").then(r => r.json());
                const posts = await fetch("https://jsonplaceholder.typicode.com/posts").then(r => r.json());

                const pending = posts.filter(p => p.userId === 1); // rule for pending

                const ordersPerCustomer = users.map(u => ({
                    name: u.name,
                    orders: posts.filter(p => p.userId === u.id).length
                }));

                const data = {
                    totalCustomers: users.length,
                    totalOrders: posts.length,
                    pendingOrders: pending.length,
                    ordersPerCustomer,
                    orderStatus: [
                        { status: "Completed", count: posts.length - pending.length },
                        { status: "Pending", count: pending.length }
                    ]
                };

                this.getView().getModel("dashboard").setData(data);

            } catch (e) {
                console.error("API error:", e);
            }
        },

        onProfilePress(oEvent) {
            this.byId("profileMenu").openBy(oEvent.getSource());
        }

    });
});
