/* eslint-env jquery, browser */
function shMqttOptions(check) {
    if (!check) {
        check = $('#checks_mqtt');
    }
    if (check.target) {
        check = $(check.target);
    }
    if (check.is(':checked')) {
        $('.form-row.mqtt').show();
    } else {
        $('.form-row.mqtt').hide();
    }
}
$().ready(() => {
    $('#checks_mqtt').on('change', shMqttOptions);
    shMqttOptions();
});