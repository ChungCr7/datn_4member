import 'package:intl/intl.dart';

class DateFormatter {
  DateFormatter._();

  static final _dateTime = DateFormat('dd/MM/yyyy HH:mm');
  static final _date = DateFormat('dd/MM/yyyy');

  static String dateTime(DateTime value) => _dateTime.format(value);
  static String date(DateTime value) => _date.format(value);
}
