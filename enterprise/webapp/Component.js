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

            // prevent route flicker on refresh
            if (window.location.hash && window.location.hash !== "#/") {
                window.history.replaceState(null, "", window.location.pathname);
            }

            UIComponent.prototype.init.apply(this, arguments);

            this.setModel(models.createDeviceModel(), "device");

            /* =======================
               GLOBAL MODELS
            ======================= */

            // CUSTOMERS
            this.setModel(new JSONModel({ items: [] }), "customers");
            this._loadCustomers();

            // ORDERS
            this.setModel(new JSONModel({ items: [] }), "orders");
            this._loadOrders();

            this.getRouter().initialize();
        },

        /* =======================
           LOADERS
        ======================= */
        _loadCustomers: function () {
            fetch("https://jsonplaceholder.typicode.com/users")
                .then(r => r.json())
                .then(data => {
                    this.getModel("customers").setProperty("/items", data);
                });
        },


        // _loadOrders: function () {
        //     fetch("https://jsonplaceholder.typicode.com/posts")
        //         .then(r => r.json())
        //         .then(data => {
        //             // 🔥 ADD DEFAULT STATUS
        //             const aOrdersWithStatus = data.map(o => ({
        //                 ...o,
        //                 status: "Pending"   // default
        //             }));

        //             this.getModel("orders")
        //                 .setProperty("/items", aOrdersWithStatus);
        //         });
        // },
        _loadOrders: function () {
    fetch("https://jsonplaceholder.typicode.com/posts")
        .then(r => r.json())
        .then(data => {
            const aWithStatus = data.map(o => {
                let status;
                if (o.id % 5 === 0) {
                    status = "Cancelled";
                } else if (o.id % 2 === 0) {
                    status = "Pending";
                } else {
                    status = "Completed";
                }

                return {
                    ...o,
                    status,
                    statusRank: this._getStatusRank(status)
                };
            });

            this.getModel("orders").setProperty("/items", aWithStatus);
        });
},

        /* =======================
           CUSTOMER CRUD (CENTRAL)
        ======================= */

        // 🔥 CASCADE DELETE (CRITICAL)
        // deleteCustomer: function (customerId) {

        //     /* ======================
        //        DELETE CUSTOMER
        //     ====================== */
        //     const oCustomersModel = this.getModel("customers");
        //     const aCustomers = oCustomersModel.getProperty("/items") || [];

        //     oCustomersModel.setProperty(
        //         "/items",
        //         aCustomers.filter(c => c.id !== customerId)
        //     );

        //     /* ======================
        //        🔥 CASCADE DELETE ORDERS
        //     ====================== */
        //     const oOrdersModel = this.getModel("orders");
        //     const aOrders = oOrdersModel.getProperty("/items") || [];

        //     const aRemainingOrders = aOrders.filter(
        //         o => o.userId !== customerId
        //     );

        //     oOrdersModel.setProperty("/items", aRemainingOrders);
        // },
        deleteCustomer: function (customerId) {
            console.log("DELETE CUSTOMER:", customerId);

            /* =========================
               CUSTOMERS
            ========================= */
            const oCustomersModel = this.getModel("customers");
            const aCustomers =
                oCustomersModel.getProperty("/items") || [];

            oCustomersModel.setProperty(
                "/items",
                aCustomers.filter(c => c.id !== customerId)
            );

            /* =========================
               ORDERS (CASCADE DELETE)
            ========================= */
            const oOrdersModel = this.getModel("orders");
            const aOrders =
                oOrdersModel.getProperty("/items") || [];

            const aRemainingOrders =
                aOrders.filter(o => o.userId !== customerId);

            oOrdersModel.setProperty("/items", aRemainingOrders);

            console.log(
                "Orders removed:",
                aOrders.length - aRemainingOrders.length
            );
        },

        /* =======================
           ORDERS CRUD (CENTRAL)
        ======================= */

        // addOrder: function (oOrder) {
        //     const oModel = this.getModel("orders");
        //     const aItems = oModel.getProperty("/items") || [];

        //     // 🔥 CLONE + REPLACE WHOLE MODEL DATA
        //     oModel.setData({
        //         items: [
        //             ...aItems.map(o => ({ ...o })),
        //             { ...oOrder }
        //         ]
        //     });
        // },
        addOrder: function (oOrder) {
    const oModel = this.getModel("orders");
    const aItems = oModel.getProperty("/items") || [];

    const oWithRank = {
        ...oOrder,
        statusRank: this._getStatusRank(oOrder.status)
    };

    oModel.setData({
        items: [
            oWithRank,
            ...aItems.map(o => ({ ...o }))
        ]
    });
},

        // updateOrder: function (oOrder) {
        //     const oModel = this.getModel("orders");
        //     const aItems = oModel.getProperty("/items").map(o =>
        //         o.id === oOrder.id ? oOrder : o
        //     );
        //     oModel.setProperty("/items", aItems);
        // },
        updateOrder: function (oOrder) {
    const oModel = this.getModel("orders");

    const aUpdated = oModel.getProperty("/items").map(o =>
        o.id === oOrder.id
            ? {
                ...oOrder,
                statusRank: this._getStatusRank(oOrder.status)
            }
            : { ...o }
    );

    oModel.setProperty("/items", aUpdated);
},

        deleteOrder: function (id) {
            const oModel = this.getModel("orders");
            const aItems = oModel.getProperty("/items")
                .filter(o => o.id !== id);
            oModel.setProperty("/items", aItems);
        },
        _getStatusRank: function (sStatus) {
            switch (sStatus) {
                case "Pending": return 1;
                case "Completed": return 2;
                case "Cancelled": return 3;
                default: return 99;
            }
        }

    });
});
