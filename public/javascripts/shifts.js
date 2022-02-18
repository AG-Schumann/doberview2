

function PopulateTable() {
  $.getJSON('/shifts/get_contacts', (data) => {
    $('#shift_table').empty();
    data.forEach(doc => $("#shift_table").append(`<tr><td onclick=ShowDetail('${doc.name}')>${doc.name}</td><td><input type="checkbox" ${doc.status >= 0?'checked':''}></td></tr>`));
  });
}

function SubmitContact() {
  var shifter = {
    first_name: $("#first_name").val(),
    last_name: $("#last_name").val(),
    sms: $("#sms").val(),
    email: $("#email").val(),
    expert: $("#expert").is(":checked")
  };
  $.post("/shifts/update_shifter", shifter, (data, status) => {
    if (typeof data.err != 'undefined')
      alert(data.err);
    else
      location.reload();
  });
}

function ShowDetail(name) {
  $.getJSON(`/shifts/contact_detail?name=${name}`, (doc) => {
    if (typeof doc.err != 'undefined') {
      alert(data.err);
      return;
    }
    ['first_name', 'last_name', 'sms', 'email'].forEach(att => $(`#${att}`).val(doc[att]));
    $("#expert").attr('checked', doc.expert);
    $("#show_btn").click();
    //$("#contact_detail").css("display", "block");
  });
}

function SubmitShifts() {
  var shifts = $("#tbody").children.map(tr => [tr.children()[0].innerHTML, tr.children()[1].checked]);
  $.post('/shifts/set_shifters', {shifts: shifts}, (data, status) => {
    if (typeof data.err != 'undefined')
      alert(data.err);
    else
      location.reload();
  });
}

function DeleteShifter() {
  var name = $("#delete_name").val();
  if (name == '')
    return;
  $.post('/shifts/delete_shifter', {name: name}, (data, status) => {
    if (typeof data.err != 'undefined')
      alert(data.err);
    else
      location.reload();
  });
}
