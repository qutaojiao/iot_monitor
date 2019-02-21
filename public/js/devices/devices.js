/* eslint-env jquery, browser */
$().ready(() => {
    $('[data-toggle="tooltip"]').tooltip();

    $('#deleteModal').on('show.bs.modal', (event) => {
        const button = $(event.relatedTarget);
        const deviceId = button.data('id');
        const deviceAlias = button.data('alias') || 'this device';
        $('#deviceToDelete').html(deviceAlias);
        $('#deviceToDeleteId').val(deviceId);
    });
    $('#deleteModal').on('hide.bs.modal', () => {
        $('#deviceToDelete').html('');
        $('#deviceToDeleteId').val('');
    });
});
