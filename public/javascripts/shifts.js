

function PopulateTable() {
  $.getJSON('/shifts/get_contacts', (data) => {
    $('#shift_table').empty();
    data.forEach(doc => $("#shift_table").append(`<tr><td onclick=ShowDetail('${doc.name}')>${doc.name}</td><td><input type="checkbox" ${doc.on_shift ?'checked':''}></td></tr>`));
  });
}

function SubmitContact() {
  var shifter = {
    first_name: $("#first_name").val(),
    last_name: $("#last_name").val(),
    sms: $("#sms").val(),
    email: $("#email").val(),
    expert: $("#expert").is(":checked"),
    on_shift: false
  };
  $.post("/shifts/update_shifter", shifter, (data, status) => {
    if (typeof data.err != 'undefined')
      alert(data.err);
    else
      location.reload();
  });
}

function ShowDetail(name) {
  if (name == null) {
    ['first_name', 'last_name', 'sms', 'email'].forEach(att => $(`#${att}`).val(""));
    $("#expert").attr('checked', false);
    $("#contact_detail").modal('show');
  } else {
    $.getJSON(`/shifts/contact_detail?name=${name}`, (doc) => {
      if (typeof doc.err != 'undefined') {
        alert(data.err);
        return;
      }
      ['first_name', 'last_name', 'sms', 'email'].forEach(att => $(`#${att}`).val(doc[att]));
      $("#expert").attr('checked', doc.expert);
      $("#contact_detail").modal('show');
    });
  }
}

function SubmitShifts() {
  var shifters = $("#shift_table tr").map((i,tr) => 
    ({
      name: tr.children[0].innerHTML,
      checked: tr.children[1].children[0].checked,
    }))
      .filter((i,row) => row.checked)
      .map((i,row) => row.name); // jquery is bullshit
  console.log(shifters);
  $.ajax({
    type: 'POST',
    url:'/shifts/set_shifters',
    data: {shifters: shifters},
    success: (data) => {
      if (typeof data.err != 'undefined')
        alert(data.err);
      else
        location.reload();
    },
    error: (jqXHR, textStatus, errorCoe) => alert(`Error: ${textStatus}, ${errorCode}`)
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
