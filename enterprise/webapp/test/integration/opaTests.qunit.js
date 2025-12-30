/* global QUnit */
QUnit.config.autostart = false;

sap.ui.require(["enterprise/test/integration/AllJourneys"
], function () {
	QUnit.start();
});
