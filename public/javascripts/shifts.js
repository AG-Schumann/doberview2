
function PopulateOnShift() {
  $.getJSON('/shifts/on_shift', (data) => {
    $('#on_shift').empty();
    data.forEach(doc => $("#on_shift").append(`<li><div class="card"><div class="card-body">
        <h3 class="card-title" onclick=ShowDetail('${doc.name}')><i class=${doc.expert ? '"fas fa-user-graduate"':'"fas fa-user"'}></i>&nbsp; ${doc.first_name} ${doc.last_name}</h3>
        <ul>
            <li><span><i class="fa-solid fa-comment-sms"></i>&nbsp; ${doc.sms}</span></li>
            <li><span><i class="fa-solid fa-phone"></i>&nbsp; ${doc.phone}</span></li>
            <li><span><i class="fa-solid fa-envelope"></i>&nbsp; ${doc.email}</span></li>
        </ul>
    </div></div></li>`));
  });
}

function PopulateTable() {
  $.getJSON('/shifts/get_contacts', (data) => {
    $('#shift_table').empty();
    data.forEach(doc => $("#shift_table").append(`<tr><td onclick=ShowDetail('${doc.name}')>${doc.name}</td><td><input type="checkbox" ${doc.on_shift ?'checked':''}></td><td><i class="fas fa-solid fa-trash" onclick="DeleteShifter('${doc.name}')"></i></td></tr>`));
  });
}

function SubmitContact() {
  var shifter = {
    first_name: $("#first_name").val(),
    last_name: $("#last_name").val(),
    sms: $("#sms").val(),
    phone: $("#phone").val(),
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
    ['first_name', 'last_name', 'sms', 'phone', 'email'].forEach(att => $(`#${att}`).val(""));
    $("#expert").attr('checked', false);
    $("#contact_detail").modal('show');
  } else {
    $.getJSON(`/shifts/contact_detail?name=${name}`, (doc) => {
      if (typeof doc.err != 'undefined') {
        alert(data.err);
        return;
      }
      ['first_name', 'last_name', 'sms', 'phone', 'email'].forEach(att => $(`#${att}`).val(doc[att]));
      $("#expert").attr('checked', doc.expert);
      $("#contact_detail").modal('show');
    });
  }
}

function SubmitShifts() {
  var shifters = $("#shift_table tr")
      .map((i,tr) =>
  ({
      name: tr.children[0].innerHTML,
      checked: tr.children[1].children[0].checked,
    }))
      .filter((i,row) => row.checked)
      .map((i,row) => row.name)
      .toArray(); // jquery is bullshit
  $.post('/shifts/set_shifters', {shifters: shifters}, (data, status) => {
  if (typeof data.err != 'undefined')
    alert(data.err);
  else
    location.reload();
  });
}

function DeleteShifter(name) {
  if (name == '')
    return;
  if (confirm(`Are you sure that you want to delete this contact?`)) {
    $.post('/shifts/delete_shifter', {name: name}, (data, status) => {
      if (typeof data.err != 'undefined')
        alert(data.err);
      else
        location.reload();
    });
  }
}
