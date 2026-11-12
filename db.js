/* Avanti Fellows · Cloud database connection (Supabase).
   Only the public "publishable" key lives here. Never put the secret key, the database password,
   or any teacher or student ID in this file or anywhere in the repository. */
(function () {
'use strict';
const SUPABASE_URL = 'https://usehxhvzhdbcmnmqaxoo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_QQ_N_B6kl416kbGMF0DQtw_9Jg58PoN';

// Call a database function (RPC). Throws a plain-language error if the network or database fails.
async function rpc(name, body) {
  let r;
  try {
    r = await fetch(SUPABASE_URL + '/rest/v1/rpc/' + name, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    });
  } catch (e) {
    throw new Error('Could not reach the database. Check your internet connection and try again.');
  }
  if (!r.ok) throw new Error('The database returned an error (' + r.status + '). Please try again.');
  return r.json();
}

window.AvantiDB = {
  url: SUPABASE_URL,
  rpc,
  // Teacher sign-in: returns the teacher's record if the AF-ID matches, otherwise an empty result.
  teacherLogin: afid => rpc('teacher_login', { p_afid: String(afid || '').trim() }),
  // Student sign-in: returns the student's record if the Stu Avanti ID matches, otherwise an empty result.
  studentLogin: id => rpc('student_login', { p_id: String(id || '').trim() })
};
})();
