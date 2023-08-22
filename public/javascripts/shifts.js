
function PopulateNavbar() {
  var content = '<li><div class="d-flex"> <button class="btn btn-primary" onclick="ShowDetail(null)">' +
      '<span>Add new &nbsp<i class="fas fa-solid fa-plus"></i><i class="fas fa-user"></i></span>' +
      '</button></div></li>';
  $('#navbar_content').html(content);
}

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

function PopulateAlarmConfig() {
  $.getJSON('/shifts/alarm_config', doc => {
    $('#silence_durations').html('<th> Silence duration / s</th>');
    $('#escalation_settings').html('<th> Escalate after X messages</td>');
    $('#recipients').html('<th> Recipients</th>');
    $('#protocols').html('<th>Protocols</th>');

    for (var i in doc.silence_duration) {
      $('#silence_durations').append(`<td><input class="form-control-sm" type="number" value="${doc.silence_duration[i]}"></td>`);
      $('#escalation_settings').append(`<td><input class="form-control-sm" type="number" value="${doc.escalation_config[i]}"></td>`);
    }
    $('#silence_durations').append('<td></td>');
    $('#escalation_settings').append('<td></td>');
    for (var i in doc.recipients) {
      var check_shifters = (doc.recipients[i].includes('shifters') ? 'checked' : '');
      var check_experts = (doc.recipients[i].includes('experts') ? 'checked' : '');;
      var check_everyone = (doc.recipients[i].includes('everyone') ? 'checked' : '');
      $('#recipients').append(`<td><div><input class="form-check-input" type="checkbox"value="" ${check_shifters}> Shifters</div>
                <div><input class="form-check-input" type="checkbox"value="" ${check_experts}> Experts</div>
                <div><input class="form-check-input" type="checkbox"value="" ${check_everyone}> Everyone</div></td>`);
      var check_mail = (doc.protocols[i].includes('email') ? 'checked' : '');
      var check_sms = (doc.protocols[i].includes('sms') ? 'checked' : '');
      var check_phone = (doc.protocols[i].includes('phone') ? 'checked' : '');
      $('#protocols').append(`<td><div><input class="form-check-input" type="checkbox"value="" ${check_mail}> Mail</div>
                <div><input class="form-check-input" type="checkbox"value="" ${check_sms}> SMS</div>
                <div><input class="form-check-input" type="checkbox"value="" ${check_phone}> Phone call</div></td>`);
    }
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

function SetAlarmConfig() {
  $.post('/shifts/set_alarm_config', (data, status) => {
    if (typeof data.err != 'undefined')
      alert(data.err);
  });

}
